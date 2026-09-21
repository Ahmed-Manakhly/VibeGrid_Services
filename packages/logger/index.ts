import pino, { Logger as PinoInstance, LoggerOptions } from "pino";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  service?: string;
  error?: Error | unknown;
  [key: string]: unknown;
}

export interface ILogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, errorOrContext?: Error | unknown | LogContext, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  child(bindings: LogContext): ILogger;
}

export const REDACT_PATHS = [
  "authorization",
  "headers.authorization",
  "req.headers.authorization",
  "cookie",
  "headers.cookie",
  "req.headers.cookie",
  "set-cookie",
  "headers.set-cookie",
  "res.headers.set-cookie",
  "access_token",
  "refresh_token",
  "token",
  "accessToken",
  "refreshToken",
  "password",
  "newPassword",
  "oldPassword",
  "secret",
  "clientSecret",
  "otp",
  "emailToken",
];

export class PinoServiceLogger implements ILogger {
  private logger: PinoInstance;
  private serviceName: string;

  constructor(serviceName: string, customInstance?: PinoInstance) {
    this.serviceName = serviceName;

    if (customInstance) {
      this.logger = customInstance;
      return;
    }

    const isProduction = process.env.NODE_ENV === "production";
    const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

    const pinoOptions: LoggerOptions = {
      name: this.serviceName,
      level: logLevel,
      redact: {
        paths: REDACT_PATHS,
        censor: "[REDACTED]",
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    };

    if (isProduction) {
      const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const transport = pino.transport({
        targets: [
          {
            target: "pino/file",
            options: { destination: 1 },
            level: logLevel,
          },
          {
            target: "pino-roll",
            options: {
              file: path.join(logDir, `${this.serviceName}`),
              frequency: "daily",
              mkdir: true,
              size: "20m",
            },
            level: logLevel,
          },
        ],
      });

      this.logger = pino(pinoOptions, transport);
    } else {
      this.logger = pino(pinoOptions);
    }
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.formatContext(context), message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatContext(context), message);
  }

  error(message: string, errorOrContext?: Error | unknown | LogContext, context?: LogContext): void {
    let errObj: Record<string, unknown> = {};
    let extraContext: LogContext = {};

    if (errorOrContext instanceof Error) {
      errObj = {
        error: {
          name: errorOrContext.name,
          message: errorOrContext.message,
          stack: errorOrContext.stack,
        },
      };
      extraContext = context || {};
    } else if (typeof errorOrContext === "object" && errorOrContext !== null) {
      extraContext = errorOrContext as LogContext;
    }

    this.logger.error(this.formatContext({ ...errObj, ...extraContext }), message);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatContext(context), message);
  }

  child(bindings: LogContext): ILogger {
    return new PinoServiceLogger(this.serviceName, this.logger.child(this.formatContext(bindings)));
  }

  private formatContext(context?: LogContext): Record<string, unknown> {
    if (!context) return { service: this.serviceName };
    return { service: this.serviceName, ...context };
  }
}

export function createLogger(serviceName: string): ILogger {
  return new PinoServiceLogger(serviceName);
}

/**
 * Express HTTP Request Logger Middleware for VibeGrid microservices.
 * Captures request correlation ID (X-Request-ID), timing, status code, route, and method.
 * Enforces zero payload/cookie/credential leakage in HTTP logs.
 */
export function createExpressHttpLogger(logger: ILogger, serviceName: string) {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();

    // 1. Normalize/Sanitize incoming X-Request-ID or generate UUID
    let requestId = req.headers["x-request-id"] as string;
    if (!requestId || typeof requestId !== "string" || requestId.trim().length === 0) {
      requestId = crypto.randomUUID();
    } else {
      // Basic sanitization to prevent log injection attack characters
      requestId = requestId.trim().replace(/[^a-zA-Z0-9\-_.]/g, "");
    }

    // Attach to request context & response header
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      const logContext: LogContext = {
        service: serviceName,
        requestId,
        method: req.method,
        route: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
      };

      if (res.statusCode >= 500) {
        logger.error(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, logContext);
      } else if (res.statusCode >= 400) {
        logger.warn(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, logContext);
      } else {
        logger.info(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, logContext);
      }
    });

    next();
  };
}

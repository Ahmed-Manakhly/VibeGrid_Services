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
  "email",
  "to",
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

    // Derive service subfolder name (e.g. 'vibegrid-auth' -> 'auth')
    const serviceFolder = this.serviceName.replace(/^vibegrid-/, "").replace(/-service$/, "");
    let baseLogDir = process.env.LOG_DIR;
    if (!baseLogDir) {
      baseLogDir = path.join(process.cwd(), "logs");
    }
    
    // If LOG_DIR already targets a service subfolder (e.g., /app/logs), use it directly
    const serviceLogDir = baseLogDir.endsWith(serviceFolder) ? baseLogDir : path.join(baseLogDir, serviceFolder);

    if (!fs.existsSync(serviceLogDir)) {
      fs.mkdirSync(serviceLogDir, { recursive: true });
    }

    const targets: any[] = [
      {
        target: "pino/file",
        options: { destination: 1 }, // Stdout stream
        level: logLevel,
      },
    ];

    // Enable file rolling transport in dev / staging or when explicitly configured
    if (process.env.ENABLE_FILE_LOGGING !== "false") {
      targets.push(
        {
          target: "pino-roll",
          options: {
            file: path.join(serviceLogDir, "app"),
            frequency: "daily",
            extension: ".log",
            mkdir: true,
            size: "20m",
            maxFiles: 14,
          },
          level: logLevel,
        },
        {
          target: "pino-roll",
          options: {
            file: path.join(serviceLogDir, "error"),
            frequency: "daily",
            extension: ".log",
            mkdir: true,
            size: "20m",
            maxFiles: 30,
          },
          level: "warn",
        }
      );
    }

    const transport = pino.transport({ targets });
    this.logger = pino(pinoOptions, transport);
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

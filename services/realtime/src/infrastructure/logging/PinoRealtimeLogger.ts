import pino from 'pino';

export class PinoRealtimeLogger {
  private logger: pino.Logger;

  constructor(serviceName: string = 'vibegrid-realtime-gateway') {
    this.logger = pino({
      name: serviceName,
      level: process.env.LOG_LEVEL || 'info',
      redact: ['headers.authorization', 'token', 'access_token', 'password', 'secret'],
      base: { service: serviceName, env: process.env.NODE_ENV || 'development' },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  public info(message: string, context?: Record<string, any>): void {
    this.logger.info(context || {}, message);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(context || {}, message);
  }

  public error(message: string, context?: Record<string, any>): void {
    this.logger.error(context || {}, message);
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(context || {}, message);
  }
}

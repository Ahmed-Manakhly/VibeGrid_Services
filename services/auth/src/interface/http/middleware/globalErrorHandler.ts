import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../../infrastructure/logging/logger';
import {
  InvalidCredentialsError,
  UserNotFoundError,
  AccountLockedError,
  DuplicateEmailError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError
} from '../../../application/errors/errors';

const logger = createLogger('vibegrid-auth');

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If response has already been sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err);
  }

  const correlationId = (req?.headers?.['x-request-id'] || req?.headers?.['x-correlation-id']) as string | undefined;

  let statusCode = 500;
  let clientMessage = 'Internal server error';

  // 1. Domain & Application Typed Errors
  if (err instanceof ValidationError) {
    statusCode = 400;
    clientMessage = err.message;
  } else if (err instanceof InvalidCredentialsError || err instanceof UnauthorizedError || err instanceof AccountLockedError) {
    statusCode = 401;
    clientMessage = err.message;
  } else if (err instanceof ForbiddenError) {
    statusCode = 403;
    clientMessage = err.message;
  } else if (err instanceof UserNotFoundError || err instanceof NotFoundError) {
    statusCode = 404;
    clientMessage = err.message;
  } else if (err instanceof DuplicateEmailError || err instanceof ConflictError) {
    statusCode = 409;
    clientMessage = err.message;
  } else if (err instanceof RateLimitError) {
    statusCode = 429;
    clientMessage = err.message;
  }
  // 2. Known JWT Errors
  else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    statusCode = 401;
    clientMessage = 'Invalid or expired authentication token';
  }
  // 3. Mongoose Persistence Infrastructure Errors
  else if (err?.code === 11000) {
    statusCode = 409;
    clientMessage = 'A resource with this key already exists';
  } else if (err?.name === 'CastError') {
    statusCode = 400;
    clientMessage = 'Invalid resource identifier format';
  } else if (err?.name === 'ValidationError') {
    statusCode = 400;
    clientMessage = err.message || 'Database validation failed';
  }
  // 4. Fallback generic handling for unexpected errors
  else {
    statusCode = 500;
    const isProd = process.env.NODE_ENV === 'production';
    clientMessage = isProd ? 'Internal server error' : (err.message || 'Internal server error');
  }

  // Log 500 internal errors for diagnostics
  if (statusCode === 500) {
    logger.error('Unhandled Server Error', { error: err, correlationId, url: req.url, method: req.method });
  }

  res.status(statusCode).json({ error: clientMessage });
}

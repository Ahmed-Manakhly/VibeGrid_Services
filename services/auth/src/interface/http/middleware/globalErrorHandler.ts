import { Request, Response, NextFunction } from 'express';
import {
  ApplicationError,
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

export function globalErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If response has already been sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err);
  }

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
  // 4. Custom status attached to error object
  else if (typeof err?.status === 'number') {
    statusCode = err.status;
    clientMessage = err.message;
  } else if (typeof err?.statusCode === 'number') {
    statusCode = err.statusCode;
    clientMessage = err.message;
  }
  // 5. Fallback generic handling
  else {
    statusCode = 500;
    const isProd = process.env.NODE_ENV === 'production';
    clientMessage = isProd ? 'Internal server error' : (err.message || 'Internal server error');
  }

  // Log 500 internal errors for diagnostics
  if (statusCode === 500) {
    console.error('❌ [Unhandled Server Error]:', err);
  }

  res.status(statusCode).json({ error: clientMessage });
}

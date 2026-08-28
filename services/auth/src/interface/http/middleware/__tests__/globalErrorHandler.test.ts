import { Request, Response, NextFunction } from 'express';
import { globalErrorHandler } from '../globalErrorHandler';
import { asyncHandler } from '../asyncHandler';
import {
  ValidationError,
  InvalidCredentialsError,
  UnauthorizedError,
  ForbiddenError,
  UserNotFoundError,
  NotFoundError,
  DuplicateEmailError,
  ConflictError,
  RateLimitError
} from '../../../../application/errors/errors';

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.headersSent = false;
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: any) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('Global Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = createMockRes();
    mockNext = jest.fn();
  });

  it('should map ValidationError to HTTP 400', () => {
    const err = new ValidationError('Invalid input payload');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid input payload' });
  });

  it('should map InvalidCredentialsError to HTTP 401', () => {
    const err = new InvalidCredentialsError('Invalid email or password');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });

  it('should map UnauthorizedError to HTTP 401', () => {
    const err = new UnauthorizedError('Authentication token missing');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication token missing' });
  });

  it('should map TokenExpiredError to HTTP 401', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired authentication token' });
  });

  it('should map ForbiddenError to HTTP 403', () => {
    const err = new ForbiddenError('Forbidden: Insufficient privileges');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient privileges' });
  });

  it('should map UserNotFoundError & NotFoundError to HTTP 404', () => {
    const err1 = new UserNotFoundError('User profile not found');
    globalErrorHandler(err1, mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User profile not found' });

    const mockRes2 = createMockRes();
    const err2 = new NotFoundError('Route not found');
    globalErrorHandler(err2, mockReq as Request, mockRes2 as Response, mockNext);
    expect(mockRes2.status).toHaveBeenCalledWith(404);
    expect(mockRes2.json).toHaveBeenCalledWith({ error: 'Route not found' });
  });

  it('should map DuplicateEmailError & ConflictError to HTTP 409', () => {
    const err = new DuplicateEmailError('Email already registered');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email already registered' });
  });

  it('should map RateLimitError to HTTP 429', () => {
    const err = new RateLimitError('Too many requests');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Too many requests' });
  });

  it('should suppress internal error details in production mode for 500 errors', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Database password leak: secret123');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });

    process.env.NODE_ENV = originalEnv;
  });

  it('should delegate to next(err) if res.headersSent is true', () => {
    mockRes.headersSent = true;
    const err = new Error('Post-header failure');
    globalErrorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(err);
  });
});

describe('asyncHandler Utility', () => {
  it('should forward thrown errors in async functions to next()', async () => {
    const mockNext = jest.fn();
    const asyncFn = asyncHandler(async () => {
      throw new ValidationError('Async failure');
    });

    await asyncFn({} as Request, {} as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});

describe('End-to-End Async Error Propagation Chain', () => {
  it('should propagate a rejected use case error through controller & asyncHandler to globalErrorHandler producing expected HTTP status and JSON', async () => {
    // 1. Mock Use Case rejecting with typed domain error
    const mockUseCase = {
      execute: jest.fn().mockRejectedValue(new InvalidCredentialsError('Invalid email or password'))
    };

    // 2. Controller method invoking use case
    class TestController {
      login = async (req: Request, res: Response): Promise<void> => {
        await mockUseCase.execute(req.body);
        res.status(200).json({ ok: true });
      };
    }

    const controller = new TestController();
    const mockReq = { body: { email: 'user@example.com', password: 'wrong' } } as Request;
    const mockRes = createMockRes();

    // 3. asyncHandler wrapping the controller action
    const wrappedRoute = asyncHandler(controller.login);

    // 4. Await asynchronous promise resolution through asyncHandler to globalErrorHandler
    await new Promise<void>((resolve) => {
      const handleNext = (err: any) => {
        globalErrorHandler(err, mockReq, mockRes as Response, jest.fn());
        resolve();
      };
      wrappedRoute(mockReq, mockRes as Response, handleNext);
    });

    // 5. Assert complete chain results in HTTP 401 with safe client JSON message
    expect(mockUseCase.execute).toHaveBeenCalledWith(mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });
});

import { createMediaAuthMiddleware, AuthenticatedRequest } from '../interface/http/middleware/mediaAuthMiddleware';
import { Response, NextFunction } from 'express';

describe('mediaAuthMiddleware — Gateway Trust & Verification', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should trust and consume X-User-* identity headers injected by Nginx Gateway', () => {
    const middleware = createMediaAuthMiddleware();

    req.headers = {
      'x-user-id': 'usr_gateway_123',
      'x-user-email': 'user@vibegrid.com',
      'x-user-role': 'ADMIN'
    };

    middleware(req as AuthenticatedRequest, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      userId: 'usr_gateway_123',
      email: 'user@vibegrid.com',
      role: 'ADMIN'
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject requests missing both Gateway headers and Bearer/Cookie token', () => {
    const middleware = createMediaAuthMiddleware();

    middleware(req as AuthenticatedRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Authentication required'
    });
    expect(next).not.toHaveBeenCalled();
  });
});

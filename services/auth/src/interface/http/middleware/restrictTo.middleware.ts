import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../../application/errors/errors';

export function createRestrictToMiddleware(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new ForbiddenError('Forbidden: Insufficient privileges'));
    }
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { ValidateTokenGuardUseCase } from '../../../application/use-cases/ValidateTokenGuard.usecase';
import { ITokenSigner } from '../../../domain/ports/ITokenSigner';
import { UnauthorizedError } from '../../../application/errors/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function createProtectMiddleware(
  validateTokenGuard: ValidateTokenGuardUseCase,
  tokenSigner: ITokenSigner
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const decoded = tokenSigner.verifyAccessToken(token);
      if (!decoded || !decoded.sub) {
        return next(new UnauthorizedError('Invalid or expired token'));
      }

      const guardResult = await validateTokenGuard.execute({
        token,
        userId: decoded.sub,
        decodedRole: decoded.role,
        tokenIat: decoded.iat || 0
      });

      if (!guardResult.isValid) {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return next(new UnauthorizedError(guardResult.reason || 'Invalid or revoked token'));
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (err: any) {
      return next(new UnauthorizedError('Authentication failed'));
    }
  };
}

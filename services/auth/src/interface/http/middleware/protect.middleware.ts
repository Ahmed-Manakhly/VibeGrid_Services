import { Request, Response, NextFunction } from 'express';
import { ValidateTokenGuardUseCase } from '../../../application/use-cases/ValidateTokenGuard.usecase';
import { RS256TokenSigner } from '../../../infrastructure/security/RS256TokenSigner';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function createProtectMiddleware(
  validateTokenGuard: ValidateTokenGuardUseCase,
  tokenSigner: RS256TokenSigner
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const decoded = tokenSigner.verifyAccessToken(token);
      if (!decoded || !decoded.sub) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
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
        res.status(401).json({ error: guardResult.reason });
        return;
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (err: any) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

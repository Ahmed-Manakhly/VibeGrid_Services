import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function createMediaAuthMiddleware(publicKeyPath?: string) {
  const defaultPath = path.resolve(__dirname, '../../../secrets/jwt.public.key');
  const keyPath = publicKeyPath || process.env.JWT_PUBLIC_KEY_PATH || defaultPath;

  let publicKey: string;
  try {
    publicKey = fs.readFileSync(keyPath, 'utf8');
  } catch (err) {
    console.warn(`[MediaAuthMiddleware Warning] Could not load public key at ${keyPath}, falling back to env string or dummy`);
    publicKey = process.env.JWT_PUBLIC_KEY || '';
  }

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      let token: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (req.cookies && req.cookies.access_token) {
        token = req.cookies.access_token;
      }

      if (!token) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
      
      const userId = decoded.sub || decoded.userId;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Invalid token payload: missing sub/userId' });
        return;
      }

      req.user = {
        userId,
        email: decoded.email || '',
        role: decoded.role || 'USER',
      };

      next();
    } catch (err: any) {
      res.status(401).json({ status: 'error', message: 'Invalid or expired token', error: err.message });
    }
  };
}

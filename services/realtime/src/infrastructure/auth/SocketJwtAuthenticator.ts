import fs from 'fs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  role: string;
}

export class SocketJwtAuthenticator {
  private publicKey: string;

  constructor(publicKeyPath?: string, publicKeyEnv?: string) {
    if (publicKeyEnv && publicKeyEnv.trim().length > 0) {
      this.publicKey = publicKeyEnv;
    } else if (publicKeyPath) {
      if (!fs.existsSync(publicKeyPath)) {
        throw new Error(`[Auth Error] RSA Public Key file missing at path: ${publicKeyPath}`);
      }
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    } else {
      throw new Error('[Auth Error] RSA Public Key not configured via JWT_PUBLIC_KEY_PATH or JWT_PUBLIC_KEY');
    }
  }

  public verifyToken(rawToken: string): AuthenticatedUserPayload {
    const decoded = jwt.verify(rawToken, this.publicKey, {
      algorithms: ['RS256'],
      issuer: 'vibegrid-auth-service',
      audience: 'vibegrid-api',
    }) as any;

    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      throw new Error('Invalid JWT payload: missing sub or userId');
    }

    return {
      userId,
      email: decoded.email || '',
      role: decoded.role || 'USER',
    };
  }

  public extractTokenFromHandshake(handshake: any): string | null {
    // 1. Handshake auth object: auth: { token: '...' } or auth: { token: 'Bearer ...' }
    if (handshake.auth && typeof handshake.auth.token === 'string') {
      const token = handshake.auth.token;
      return token.startsWith('Bearer ') ? token.substring(7) : token;
    }

    // 2. Query string: ?token=...
    if (handshake.query && typeof handshake.query.token === 'string') {
      const token = handshake.query.token;
      return token.startsWith('Bearer ') ? token.substring(7) : token;
    }

    // 3. Authorization Header
    if (handshake.headers && typeof handshake.headers.authorization === 'string') {
      const authHeader = handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    // 4. Cookie header
    if (handshake.headers && typeof handshake.headers.cookie === 'string') {
      const parsedCookies = cookie.parse(handshake.headers.cookie);
      const cookieToken = parsedCookies.vibegrid_access_token || parsedCookies.access_token;
      if (cookieToken) {
        return cookieToken;
      }
    }

    return null;
  }
}

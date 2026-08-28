import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

import { ITokenSigner } from '../../domain/ports/ITokenSigner';

export class RS256TokenSigner implements ITokenSigner {
  private privateKey: string;
  private publicKey: string;

  constructor(privateKeyPath?: string, publicKeyPath?: string) {
    const defaultPrivatePath = path.resolve(__dirname, '../../../secrets/jwt.private.key');
    const defaultPublicPath = path.resolve(__dirname, '../../../secrets/jwt.public.key');

    const privPath = privateKeyPath || process.env.JWT_PRIVATE_KEY_PATH || defaultPrivatePath;
    const pubPath = publicKeyPath || process.env.JWT_PUBLIC_KEY_PATH || defaultPublicPath;

    this.privateKey = fs.readFileSync(privPath, 'utf8');
    this.publicKey = fs.readFileSync(pubPath, 'utf8');
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public signAccessToken(payload: { sub: string; email: string; role: string }): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'vibegrid-auth-service'
    });
  }

  public verifyAccessToken(token: string): any {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: 'vibegrid-auth-service'
    });
  }
}

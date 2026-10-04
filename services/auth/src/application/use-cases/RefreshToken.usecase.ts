import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { ITokenSigner } from '../../domain/ports/ITokenSigner';
import { RefreshToken } from '../../domain/entities/RefreshToken.entity';
import crypto from 'crypto';

import { UnauthorizedError, UserNotFoundError } from '../errors/errors';

export class RefreshTokenUseCase {
  constructor(
    private refreshTokenRepo: IRefreshTokenRepo,
    private userAuthRepo: IUserAuthRepository,
    private tokenSigner: ITokenSigner,
    private refreshTokenTTLMs: number = 7 * 24 * 60 * 60 * 1000
  ) {}

  async execute(fullRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const parts = fullRefreshToken.split(':');
    if (parts.length !== 2) {
      throw new UnauthorizedError('Invalid refresh token format');
    }

    const [familyId, rawToken] = parts;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const existingToken = await this.refreshTokenRepo.findByTokenHash(tokenHash);

    // Reuse detection: if token missing or revoked, revoke entire family
    if (!existingToken || existingToken.isRevoked) {
      await this.refreshTokenRepo.revokeFamily(familyId);
      throw new UnauthorizedError('Refresh token reuse detected or token revoked');
    }

    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Revoke old token
    existingToken.revoke();
    await this.refreshTokenRepo.save(existingToken);

    // Retrieve user for fresh claims
    const user = await this.userAuthRepo.findById(existingToken.userId);
    if (!user) {
      await this.refreshTokenRepo.revokeFamily(familyId);
      throw new UserNotFoundError('User not found');
    }

    // 1. Check user.isActive, isDeleted, and isLockedOut
    const now = new Date();
    if (!user.isActive || user.isDeleted || user.isLockedOut(now)) {
      await this.refreshTokenRepo.revokeFamily(familyId);
      throw new UnauthorizedError('User account is inactive, locked, or deleted');
    }

    // 2. Check passwordChangedAt vs existingToken.createdAt
    if (user.passwordChangedAt && existingToken.createdAt) {
      const passwordChangedTimeSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      const tokenCreatedTimeSec = Math.floor(existingToken.createdAt.getTime() / 1000);
      if (tokenCreatedTimeSec < passwordChangedTimeSec) {
        await this.refreshTokenRepo.revokeFamily(familyId);
        throw new UnauthorizedError('Password was changed after token issuance. Please login again.');
      }
    }

    // 3. Check role drift (token role vs DB user role)
    if (existingToken.role && existingToken.role !== user.role) {
      await this.refreshTokenRepo.revokeFamily(familyId);
      throw new UnauthorizedError('User role has changed. Please login again.');
    }

    // Revoke old token
    existingToken.revoke();
    await this.refreshTokenRepo.save(existingToken);

    // Issue new access token
    const newAccessToken = this.tokenSigner.signAccessToken({
      sub: user.id!,
      email: user.email,
      role: user.role
    });

    // Issue new rotated refresh token in same family
    const newRawToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');

    const newTokenEntity = RefreshToken.create({
      userId: user.id!,
      tokenHash: newTokenHash,
      familyId,
      role: user.role,
      isRevoked: false,
      expiresAt: new Date(Date.now() + this.refreshTokenTTLMs)
    });

    await this.refreshTokenRepo.save(newTokenEntity);

    return {
      accessToken: newAccessToken,
      refreshToken: `${familyId}:${newRawToken}`
    };
  }
}

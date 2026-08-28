import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { IRevokedTokenRepository } from '../../domain/ports/IRevokedTokenRepository';
import { PasswordComplexityValidator } from '../../domain/value-objects/PasswordComplexityValidator.vo';
import { RevokedToken } from '../../domain/entities/RevokedToken.entity';

export interface ChangePasswordInputDTO {
  userId: string;
  currentPassword: string;
  newPassword: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
}

import { UserNotFoundError, InvalidCredentialsError, ValidationError } from '../errors/errors';

export class ChangePasswordUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private hasher: IPasswordHasher,
    private revokedTokenRepo: IRevokedTokenRepository
  ) {}

  public async execute(input: ChangePasswordInputDTO): Promise<void> {
    const user = await this.userAuthRepo.findById(input.userId);
    if (!user || !user.passwordHash) {
      throw new UserNotFoundError('User not found or using OAuth authentication');
    }

    // 1. Verify current password
    const isCurrentValid = await this.hasher.verify(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    // 2. Validate new password complexity
    const validation = PasswordComplexityValidator.validate(input.newPassword);
    if (!validation.isValid) {
      throw new ValidationError(validation.error || 'New password does not meet security requirements');
    }

    // 3. Hash new password & update passwordChangedAt
    const newHash = await this.hasher.hash(input.newPassword);
    user.updatePassword(newHash);
    await this.userAuthRepo.save(user);

    // 4. Revoke access token
    if (input.accessToken) {
      const accessRevocation = RevokedToken.create({
        token: input.accessToken,
        type: 'ACCESS',
        expiresAt: input.accessTokenExpiresAt || new Date(Date.now() + 15 * 60 * 1000)
      });
      await this.revokedTokenRepo.revoke(accessRevocation);
    }

    // 5. Revoke refresh token if present
    if (input.refreshToken) {
      const refreshRevocation = RevokedToken.create({
        token: input.refreshToken,
        type: 'REFRESH',
        expiresAt: input.refreshTokenExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      await this.revokedTokenRepo.revoke(refreshRevocation);
    }
  }
}

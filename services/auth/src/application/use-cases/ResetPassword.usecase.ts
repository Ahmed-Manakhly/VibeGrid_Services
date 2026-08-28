import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { IRevokedTokenRepository } from '../../domain/ports/IRevokedTokenRepository';
import { PasswordComplexityValidator } from '../../domain/value-objects/PasswordComplexityValidator.vo';

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

import { ValidationError, UnauthorizedError, UserNotFoundError, AccountLockedError } from '../errors/errors';

export class ResetPasswordUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private emailTokenRepo: IEmailTokenRepository,
    private passwordHasher: IPasswordHasher,
    private revokedTokenRepo: IRevokedTokenRepository
  ) {}

  public async execute(input: ResetPasswordInput): Promise<{ message: string }> {
    const email = input.email.toLowerCase();

    // 1. Password confirmation check
    if (input.newPassword !== input.confirmPassword) {
      throw new ValidationError('Password and Confirm Password do not match.');
    }

    // 2. Complexity validation
    const complexityCheck = PasswordComplexityValidator.validate(input.newPassword);
    if (!complexityCheck.isValid) {
      throw new ValidationError(complexityCheck.error || 'Password does not meet security criteria.');
    }

    // 3. Find OTP token
    const tokenRecord = await this.emailTokenRepo.findByEmail(email);
    if (!tokenRecord) {
      throw new ValidationError('Invalid email or reset request expired.');
    }

    if (tokenRecord.isExpired()) {
      await this.emailTokenRepo.deleteByEmail(email);
      throw new ValidationError('OTP has expired. Please request a new one.');
    }

    // 4. Verify OTP code
    const isOtpValid = await this.passwordHasher.verify(input.otp, tokenRecord.emailToken);
    if (!isOtpValid) {
      throw new UnauthorizedError('Invalid OTP code. Please check your email.');
    }

    // 5. Find User
    const user = await this.userAuthRepo.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError('User not found.');
    }

    if (!user.isActive) {
      throw new AccountLockedError('Account is locked. Please contact support.');
    }

    // 6. Hash new password and set passwordChangedAt
    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);
    const now = new Date();

    user.updatePassword(newPasswordHash, now);
    await this.userAuthRepo.save(user);

    // 7. Clear used OTP token
    await this.emailTokenRepo.deleteByEmail(email);

    return { message: 'Password has been reset successfully.' };
  }
}

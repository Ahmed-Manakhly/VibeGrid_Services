import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { EmailValidator } from '../../domain/value-objects/EmailValidator.vo';
import { ValidationError, UserNotFoundError } from '../errors/errors';
import crypto from 'crypto';

export interface VerifyEmailInputDTO {
  email: string;
  otp: string;
}

export class VerifyEmailUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private emailTokenRepo: IEmailTokenRepository
  ) {}

  public async execute(input: VerifyEmailInputDTO): Promise<{ message: string }> {
    if (!input.email || !input.otp) {
      throw new ValidationError('Email and OTP code are required');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const emailValidation = EmailValidator.validate(normalizedEmail);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Invalid email format');
    }

    const user = await this.userAuthRepo.findByEmail(normalizedEmail);
    if (!user || user.isDeleted) {
      throw new UserNotFoundError('User account not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const tokenDoc = await this.emailTokenRepo.findByEmail(normalizedEmail);
    const candidateHash = crypto.createHash('sha256').update(input.otp).digest('hex');

    if (!tokenDoc || tokenDoc.tokenHash !== candidateHash) {
      throw new ValidationError('Invalid or expired OTP verification code');
    }

    if (tokenDoc.isExpired()) {
      await this.emailTokenRepo.deleteByEmail(normalizedEmail);
      throw new ValidationError('OTP verification code has expired');
    }

    user.verifyEmail();
    await this.userAuthRepo.save(user);
    await this.emailTokenRepo.deleteByEmail(normalizedEmail);

    return { message: 'Email verified successfully' };
  }
}

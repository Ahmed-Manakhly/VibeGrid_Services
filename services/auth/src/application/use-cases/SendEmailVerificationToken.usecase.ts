import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { IEmailSender } from '../../domain/ports/IEmailSender';
import { EmailToken } from '../../domain/entities/EmailToken.entity';
import { EmailValidator } from '../../domain/value-objects/EmailValidator.vo';
import { ValidationError, UserNotFoundError } from '../errors/errors';
import { EmailVerificationTemplate } from '../../infrastructure/email/templates/EmailVerificationTemplate';
import crypto from 'crypto';

export interface SendEmailVerificationInputDTO {
  email: string;
}

export class SendEmailVerificationTokenUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private emailTokenRepo: IEmailTokenRepository,
    private emailSender: IEmailSender,
    private tokenExpiryInSec: number = 900
  ) {}

  public async execute(input: SendEmailVerificationInputDTO): Promise<{ message: string }> {
    if (!input.email) {
      throw new ValidationError('Email is required');
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

    // Rate limiting: check if a token was sent in the last 60 seconds
    const existingToken = await this.emailTokenRepo.findByEmail(normalizedEmail);
    if (existingToken && !existingToken.isExpired()) {
      const timeSinceCreation = Date.now() - existingToken.createdAt.getTime();
      if (timeSinceCreation < 60000) {
        throw new ValidationError('Please wait before requesting another verification code');
      }
    }

    // Generate 6-digit OTP code
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresInMs = this.tokenExpiryInSec * 1000;
    const expiresInMinutes = Math.ceil(this.tokenExpiryInSec / 60);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const tokenEntity = EmailToken.create({
      email: normalizedEmail,
      tokenHash: otpHash,
      expiresAt
    });

    await this.emailTokenRepo.upsert(tokenEntity);

    // Render email using template renderer
    const { subject, html, text } = EmailVerificationTemplate.render({
      name: user.name,
      otp,
      expiresInMinutes
    });

    // Send verification email — errors are allowed to propagate cleanly
    await this.emailSender.sendEmail({
      to: normalizedEmail,
      subject,
      html,
      text
    });

    return { message: 'Verification OTP code sent to your email' };
  }
}

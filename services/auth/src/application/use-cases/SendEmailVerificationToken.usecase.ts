import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { IEmailSender } from '../../domain/ports/IEmailSender';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IEmailVerificationService, SendEmailVerificationInput } from '../../domain/ports/IEmailVerificationService';
import { EmailToken } from '../../domain/entities/EmailToken.entity';
import { EmailValidator } from '../../domain/value-objects/EmailValidator.vo';
import { EmailVerificationRequestedEvent } from '../../domain/events/EmailVerificationRequested.event';
import { ValidationError, UserNotFoundError } from '../errors/errors';
import { createLogger } from '@vibegrid/logger';
import crypto from 'crypto';

const logger = createLogger('vibegrid-auth');

export interface SendEmailVerificationInputDTO extends SendEmailVerificationInput {
  email: string;
}

export class SendEmailVerificationTokenUseCase implements IEmailVerificationService {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private emailTokenRepo: IEmailTokenRepository,
    private emailSender: IEmailSender,
    private eventPublisher: IEventPublisher,
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

    // 1. Publish Event-Driven Message (Pub/Sub) to RabbitMQ for Email Service Worker
    const verificationEvent = new EmailVerificationRequestedEvent({
      email: normalizedEmail,
      name: user.name,
      otp,
      expiresInMinutes,
      requestedAt: new Date()
    });

    try {
      await this.eventPublisher.publish(verificationEvent.eventName, {
        eventId: verificationEvent.eventId,
        eventName: verificationEvent.eventName,
        correlationId: verificationEvent.correlationId,
        timestamp: verificationEvent.timestamp,
        version: verificationEvent.version,
        payload: verificationEvent.payload
      });
    } catch (err: any) {
      logger.warn(`Failed to publish verification event for user`, { error: err });
    }

    // 2. Direct fallback send if local email sender is configured
    try {
      await this.emailSender.sendEmailVerification({
        to: normalizedEmail,
        name: user.name,
        otp,
        expiresInMinutes
      });
    } catch (err: any) {
      // Fallback logged via structured logger — PII (email/otp) automatically redacted
      logger.warn(`Direct email sender fallback failed`, { error: err });
    }

    return { message: 'Verification OTP code sent to your email' };
  }
}

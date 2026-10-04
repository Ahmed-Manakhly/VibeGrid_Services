import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { EmailToken } from '../../domain/entities/EmailToken.entity';
import { PasswordResetRequestedEvent } from '../../domain/events/PasswordResetRequested.event';
import { AccountLockedError, RateLimitError } from '../errors/errors';
import { createLogger } from '@vibegrid/logger';
import crypto from 'crypto';

const logger = createLogger('vibegrid-auth');

export interface RequestPasswordResetInput {
  email: string;
}

export class RequestPasswordResetUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private emailTokenRepo: IEmailTokenRepository,
    private passwordHasher: IPasswordHasher,
    private eventPublisher: IEventPublisher
  ) {}

  public async execute(input: RequestPasswordResetInput): Promise<{ message: string }> {
    const email = input.email.toLowerCase();

    // 1. Check if user exists
    const user = await this.userAuthRepo.findByEmail(email);
    if (!user) {
      // Return success to avoid email enumeration security attacks
      return { message: 'If an account exists with this email, an OTP has been sent.' };
    }

    if (!user.isActive) {
      throw new AccountLockedError('Account is locked. Please contact support.');
    }

    // 2. Rate limit check: look for existing unexpired token
    const existingToken = await this.emailTokenRepo.findByEmail(email);
    if (existingToken && !existingToken.isExpired()) {
      throw new RateLimitError('OTP request already sent. Please wait before requesting again.');
    }

    // 3. Generate 4-digit OTP using CSPRNG
    const otp = crypto.randomInt(1000, 10000).toString();
    const hashedOtp = await this.passwordHasher.hash(otp);

    // 4. Set 5-minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 5. Save EmailToken entity
    const emailTokenEntity = EmailToken.create({
      email,
      tokenHash: hashedOtp,
      expiresAt
    });

    await this.emailTokenRepo.upsert(emailTokenEntity);

    // 6. Publish PasswordResetRequested event to RabbitMQ for Email Microservice Worker
    const resetEvent = new PasswordResetRequestedEvent({
      email,
      name: user.name,
      otp,
      expiresInMinutes: 5,
      requestedAt: new Date()
    });

    await this.eventPublisher.publish(resetEvent.eventName, {
      eventId: resetEvent.eventId,
      eventName: resetEvent.eventName,
      correlationId: resetEvent.correlationId,
      occurredAt: resetEvent.occurredAt,
      timestamp: resetEvent.timestamp,
      version: resetEvent.version,
      payload: resetEvent.payload
    });

    logger.info('Published password.reset.requested event for user', { eventId: resetEvent.eventId });

    return { message: 'OTP sent to your email.' };
  }
}

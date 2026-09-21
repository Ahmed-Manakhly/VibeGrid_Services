import { createLogger } from '@vibegrid/logger';
import { IEmailProvider } from '../../domain/ports/IEmailProvider';
import { IIdempotencyRepository } from '../../domain/ports/IIdempotencyRepository';
import { EmailMessage } from '../../domain/value-objects/EmailMessage.vo';
import { EventEnvelopeDTO, ProcessEmailResultDTO } from '../dtos/email-event.dtos';
import crypto from 'crypto';

const logger = createLogger('vibegrid-email');

export class ProcessEmailEventUseCase {
  constructor(
    private emailProvider: IEmailProvider,
    private idempotencyRepo: IIdempotencyRepository
  ) {}

  public async execute(envelope: EventEnvelopeDTO): Promise<ProcessEmailResultDTO> {
    if (!envelope || !envelope.eventId || !envelope.eventName || !envelope.payload) {
      throw new Error('Malformed event envelope: eventId, eventName, and payload are required');
    }

    const { eventId, eventName, payload } = envelope;
    const claimId = crypto.randomUUID();

    // 1. Two-phase claim check
    const claimed = await this.idempotencyRepo.acquireClaim(eventId, claimId, 300);
    if (!claimed) {
      logger.info('Duplicate or in-flight email event skipped', { eventId, eventName });
      return { success: true, skippedDuplicate: true };
    }

    try {
      // 2. Build email message based on event type
      const emailMessage = this.buildEmailMessage(eventName, payload);

      // 3. Send email via provider port
      const startTime = Date.now();
      await this.emailProvider.send(emailMessage);
      const durationMs = Date.now() - startTime;

      // 4. Mark event completed
      await this.idempotencyRepo.markCompleted(eventId, claimId, 86400);

      logger.info('Email notification dispatched successfully', {
        eventId,
        eventName,
        template: eventName,
        durationMs,
      });

      return { success: true };
    } catch (err: any) {
      // Release claim safely on failure so retry engine can re-process if needed
      await this.idempotencyRepo.releaseClaim(eventId, claimId).catch(() => {});
      logger.error('Failed to process email event', err, { eventId, eventName });
      throw err;
    }
  }

  private buildEmailMessage(eventName: string, payload: any): EmailMessage {
    switch (eventName) {
      case 'user.registered': {
        const to = payload.email;
        const name = payload.name || 'VibeGrid User';
        return new EmailMessage({
          to,
          subject: 'Welcome to VibeGrid!',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; background: #0f172a; color: #f8fafc;">
              <h1 style="color: #a855f7;">Welcome to VibeGrid, ${name}!</h1>
              <p>Your account has been created successfully. Tune in, drop vibes, and connect with developers.</p>
              <p style="font-size: 12px; color: #94a3b8;">VibeGrid System Notification</p>
            </div>
          `,
          text: `Welcome to VibeGrid, ${name}! Your account has been created successfully.`,
        });
      }

      case 'email.verification.requested': {
        const to = payload.email;
        const name = payload.name || 'User';
        const otp = payload.otp;
        const mins = payload.expiresInMinutes || 15;
        return new EmailMessage({
          to,
          subject: 'Verify Your Email — VibeGrid',
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
              <h2 style="color: #a855f7;">VibeGrid Email Verification</h2>
              <p>Hello ${name},</p>
              <p>Your verification code is: <b style="font-size: 24px; color: #38bdf8; letter-spacing: 2px;">${otp}</b></p>
              <p>This code expires in ${mins} minutes.</p>
            </div>
          `,
          text: `Hello ${name}, your VibeGrid verification code is ${otp}. It expires in ${mins} minutes.`,
        });
      }

      case 'password.reset.requested': {
        const to = payload.email;
        const otp = payload.otp;
        const mins = payload.expiresInMinutes || 5;
        return new EmailMessage({
          to,
          subject: 'Reset Password — VibeGrid',
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
              <h2 style="color: #ef4444;">Password Reset Request</h2>
              <p>Use the code below to reset your VibeGrid password:</p>
              <p><b style="font-size: 24px; color: #fbbf24; letter-spacing: 2px;">${otp}</b></p>
              <p>This code expires in ${mins} minutes.</p>
            </div>
          `,
          text: `Use OTP code ${otp} to reset your VibeGrid password. It expires in ${mins} minutes.`,
        });
      }

      default:
        throw new Error(`Unsupported event type: ${eventName}`);
    }
  }
}

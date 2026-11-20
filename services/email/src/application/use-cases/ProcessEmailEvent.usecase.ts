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
    const brandHeader = `
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #1e293b; margin-bottom: 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <div style="display: inline-block; width: 28px; height: 28px; transform: rotate(-12deg);">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; height: 100%;">
                  <tr>
                    <td style="width: 12px; height: 12px; background: #10b981; border-radius: 3px;"></td>
                    <td style="width: 4px;"></td>
                    <td style="width: 12px; height: 12px; background: #d8b65c; border-radius: 3px;"></td>
                  </tr>
                  <tr><td colspan="3" style="height: 4px;"></td></tr>
                  <tr>
                    <td style="width: 12px; height: 12px; background: #d8b65c; border-radius: 3px;"></td>
                    <td style="width: 4px;"></td>
                    <td style="width: 12px; height: 12px; background: #10b981; border-radius: 3px;"></td>
                  </tr>
                </table>
              </div>
            </td>
            <td style="vertical-align: middle;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                <span style="color: #d8b65c;">vibe</span><span style="color: #10b981;">grid</span>
              </span>
            </td>
          </tr>
        </table>
      </div>
    `;

    const brandFooter = `
      <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">VibeGrid — Real-Time Developer Collaboration & Social Architecture</p>
        <p style="margin: 0;">This is an automated security transmission. Please do not reply directly to this email.</p>
      </div>
    `;

    switch (eventName) {
      case 'user.registered': {
        const to = payload.email;
        const name = payload.name || 'Developer';
        return new EmailMessage({
          to,
          subject: 'Welcome to VibeGrid!',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f17; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
              ${brandHeader}
              <h1 style="color: #f8fafc; font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">Welcome to VibeGrid, ${name}! 🚀</h1>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                Your developer account is active and verified. You're now connected to a real-time network of engineers sharing code dilemmas, shipping updates, and technical solutions.
              </p>
              <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #10b981; font-weight: 600; font-size: 14px; margin: 0 0 8px 0;">⚡ Quick Start:</p>
                <ul style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0; padding-left: 18px;">
                  <li>Share your current engineering challenge or recent tech ship.</li>
                  <li>Join developer communities tailored to your tech stack.</li>
                  <li>Pair on code dilemmas with real-time direct messaging.</li>
                </ul>
              </div>
              ${brandFooter}
            </div>
          `,
          text: `Welcome to VibeGrid, ${name}! Your account is active. Connect, tune in, and share code vibes with developers worldwide.`,
        });
      }

      case 'email.verification.requested': {
        const to = payload.email;
        const name = payload.name || 'Developer';
        const otp = payload.otp;
        const mins = payload.expiresInMinutes || 15;
        return new EmailMessage({
          to,
          subject: `${otp} is your VibeGrid verification code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f17; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
              ${brandHeader}
              <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">Verify Your Email Address</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello ${name}, use the verification code below to verify your email address and activate your VibeGrid account:
              </p>
              <div style="text-align: center; background: #111827; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                <span style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 32px; font-weight: 800; color: #10b981; letter-spacing: 6px; display: inline-block;">
                  ${otp}
                </span>
                <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Valid for ${mins} minutes</p>
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 0;">If you did not request this verification code, please ignore this email.</p>
              ${brandFooter}
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
          subject: `${otp} is your VibeGrid password reset code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f17; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
              ${brandHeader}
              <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">Password Reset Request</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                We received a request to reset the password for your VibeGrid developer account. Enter the authorization code below:
              </p>
              <div style="text-align: center; background: #111827; border: 1px solid rgba(216, 182, 92, 0.4); border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                <span style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 32px; font-weight: 800; color: #d8b65c; letter-spacing: 6px; display: inline-block;">
                  ${otp}
                </span>
                <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Expires in ${mins} minutes</p>
              </div>
              <p style="color: #ef4444; font-size: 12px; margin: 0 0 6px 0; font-weight: 500;">Security Notice: Never share this authorization code with anyone.</p>
              <p style="color: #64748b; font-size: 12px; margin: 0;">If you didn't request a password reset, your account is safe and no action is required.</p>
              ${brandFooter}
            </div>
          `,
          text: `Use authorization code ${otp} to reset your VibeGrid password. It expires in ${mins} minutes.`,
        });
      }

      default:
        throw new Error(`Unsupported event type: ${eventName}`);
    }
  }
}

import crypto from 'crypto';

export interface EmailVerificationRequestedPayload {
  email: string;
  name?: string;
  otp: string;
  expiresInMinutes: number;
  requestedAt: Date;
}

export class EmailVerificationRequestedEvent {
  public readonly eventName = 'email.verification.requested';
  public readonly eventId: string;
  public readonly correlationId: string;
  public readonly timestamp: string;
  public readonly version = 1;

  constructor(public readonly payload: EmailVerificationRequestedPayload) {
    this.eventId = crypto.randomUUID();
    this.correlationId = this.eventId;
    this.timestamp = new Date().toISOString();
  }
}

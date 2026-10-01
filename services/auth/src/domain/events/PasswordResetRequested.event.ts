import crypto from 'crypto';

export interface PasswordResetRequestedPayload {
  email: string;
  name?: string;
  otp: string;
  expiresInMinutes: number;
  requestedAt: Date;
}

export class PasswordResetRequestedEvent {
  public readonly eventName = 'password.reset.requested';
  public readonly eventId: string;
  public readonly correlationId: string;
  public readonly occurredAt: string;
  public readonly timestamp: string;
  public readonly version = 1;

  constructor(public readonly payload: PasswordResetRequestedPayload) {
    this.eventId = crypto.randomUUID();
    this.correlationId = this.eventId;
    this.occurredAt = new Date().toISOString();
    this.timestamp = this.occurredAt;
  }
}

export interface EventEnvelopeDTO<T = any> {
  eventId: string;
  eventName: string;
  version: number;
  timestamp: string;
  correlationId?: string;
  payload: T;
}

export interface UserRegisteredPayloadDTO {
  userId: string;
  email: string;
  name?: string;
  provider: string;
  registeredAt?: string | Date;
}

export interface EmailVerificationRequestedPayloadDTO {
  userId: string;
  email: string;
  name?: string;
  otp: string;
  expiresInMinutes: number;
}

export interface PasswordResetRequestedPayloadDTO {
  userId: string;
  email: string;
  name?: string;
  otp: string;
  expiresInMinutes: number;
}

export interface ProcessEmailResultDTO {
  success: boolean;
  skippedDuplicate?: boolean;
  error?: string;
}

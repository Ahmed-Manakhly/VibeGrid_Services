export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name?: string;
  provider?: string;
  registeredAt?: string | Date;
  version?: number;
}

export interface EventEnvelopeDTO {
  eventId: string;
  eventName: string;
  version: number;
  timestamp: string;
  payload: UserRegisteredPayload;
}

export interface ProcessOnboardingResultDTO {
  success: boolean;
  skippedDuplicate?: boolean;
  profileCreated?: boolean;
}

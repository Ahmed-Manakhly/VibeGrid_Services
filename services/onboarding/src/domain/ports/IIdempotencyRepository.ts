export interface IIdempotencyRepository {
  acquireClaim(eventId: string, claimId: string, ttlSeconds?: number): Promise<boolean>;
  markCompleted(eventId: string, claimId: string, ttlSeconds?: number): Promise<void>;
  releaseClaim(eventId: string, claimId: string): Promise<void>;
}

export interface IIdempotencyRepository {
  /**
   * Attempts to acquire an atomic processing claim for eventId.
   * Returns true if claim succeeded, false if already claimed/processing/completed.
   */
  acquireClaim(eventId: string, claimId: string, ttlSeconds?: number): Promise<boolean>;

  /**
   * Marks eventId as COMPLETED (24h TTL).
   */
  markCompleted(eventId: string, claimId: string, ttlSeconds?: number): Promise<void>;

  /**
   * Safely releases claim ONLY if claimId matches (owner-safe release).
   */
  releaseClaim(eventId: string, claimId: string): Promise<void>;
}

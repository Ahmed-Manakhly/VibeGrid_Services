import { createLogger } from '@vibegrid/logger';
import { IProfileRepository } from '../../domain/ports/IProfileRepository';
import { IIdempotencyRepository } from '../../domain/ports/IIdempotencyRepository';
import { EventEnvelopeDTO, ProcessOnboardingResultDTO } from '../dtos/onboarding-event.dtos';
import crypto from 'crypto';

const logger = createLogger('vibegrid-onboarding');

export class ProcessOnboardingEventUseCase {
  constructor(
    private profileRepo: IProfileRepository,
    private idempotencyRepo: IIdempotencyRepository
  ) {}

  public async execute(envelope: EventEnvelopeDTO): Promise<ProcessOnboardingResultDTO> {
    if (!envelope || !envelope.eventId || !envelope.eventName || !envelope.payload) {
      throw new Error('Malformed event envelope: eventId, eventName, and payload are required');
    }

    if (envelope.eventName !== 'user.registered') {
      throw new Error(`Unsupported onboarding event name: ${envelope.eventName}`);
    }

    const { userId, email, name } = envelope.payload;
    if (!userId || !email) {
      throw new Error('Invalid user.registered payload: userId and email are required');
    }

    const eventId = envelope.eventId;
    const claimId = crypto.randomUUID();

    // 1. Two-phase claim check for idempotency
    const claimed = await this.idempotencyRepo.acquireClaim(eventId, claimId, 300);
    if (!claimed) {
      logger.info('Duplicate or in-flight event skipped', { eventId, userId });
      return { success: true, skippedDuplicate: true };
    }

    try {
      // 2. Initialize application profile if missing
      const result = await this.profileRepo.initProfileIfMissing(userId, { email, name });

      // 3. Mark event processing completed
      await this.idempotencyRepo.markCompleted(eventId, claimId, 86400);

      logger.info('User onboarding profile state initialized in PostgreSQL', {
        eventId,
        userId,
        created: result.created,
      });

      return { success: true, profileCreated: result.created };
    } catch (err: any) {
      // Release claim safely on failure so RabbitMQ retry engine can re-process
      await this.idempotencyRepo.releaseClaim(eventId, claimId).catch(() => {});
      logger.error('Failed to process onboarding event', err, { eventId, userId });
      throw err;
    }
  }
}

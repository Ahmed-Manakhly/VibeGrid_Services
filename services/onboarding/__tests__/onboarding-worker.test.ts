import { ProcessOnboardingEventUseCase } from '../src/application/use-cases/ProcessOnboardingEvent.usecase';
import { IProfileRepository } from '../src/domain/ports/IProfileRepository';
import { IIdempotencyRepository } from '../src/domain/ports/IIdempotencyRepository';

describe('ProcessOnboardingEventUseCase', () => {
  let mockProfileRepo: jest.Mocked<IProfileRepository>;
  let mockIdempotencyRepo: jest.Mocked<IIdempotencyRepository>;
  let useCase: ProcessOnboardingEventUseCase;

  beforeEach(() => {
    mockProfileRepo = {
      initProfileIfMissing: jest.fn().mockResolvedValue({ created: true, user: { id: 'u_1', username: 'alex' } }),
    };
    mockIdempotencyRepo = {
      acquireClaim: jest.fn().mockResolvedValue(true),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      releaseClaim: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new ProcessOnboardingEventUseCase(mockProfileRepo, mockIdempotencyRepo);
  });

  it('should process valid user.registered event and initialize profile', async () => {
    const envelope = {
      eventId: 'evt_onboard_1',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: {
        userId: 'u_100',
        email: 'alex@example.com',
        name: 'Alex Rivera',
      },
    };

    const result = await useCase.execute(envelope);

    expect(result.success).toBe(true);
    expect(result.profileCreated).toBe(true);
    expect(mockIdempotencyRepo.acquireClaim).toHaveBeenCalledWith('evt_onboard_1', expect.any(String), 300);
    expect(mockProfileRepo.initProfileIfMissing).toHaveBeenCalledWith('u_100', {
      email: 'alex@example.com',
      name: 'Alex Rivera',
    });
    expect(mockIdempotencyRepo.markCompleted).toHaveBeenCalledWith('evt_onboard_1', expect.any(String), 86400);
  });

  it('should skip processing if event is a duplicate claim', async () => {
    mockIdempotencyRepo.acquireClaim.mockResolvedValue(false);

    const envelope = {
      eventId: 'evt_dup',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: { userId: 'u_100', email: 'dup@example.com' },
    };

    const result = await useCase.execute(envelope);

    expect(result.success).toBe(true);
    expect(result.skippedDuplicate).toBe(true);
    expect(mockProfileRepo.initProfileIfMissing).not.toHaveBeenCalled();
  });

  it('should reject malformed event or missing payload fields', async () => {
    const invalidEnvelope: any = {
      eventId: 'evt_bad',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: { email: 'no_id@example.com' },
    };

    await expect(useCase.execute(invalidEnvelope)).rejects.toThrow(
      'Invalid user.registered payload: userId and email are required'
    );
  });

  it('should release claim safely on profile repository failure', async () => {
    mockProfileRepo.initProfileIfMissing.mockRejectedValue(new Error('PostgreSQL connection timeout'));

    const envelope = {
      eventId: 'evt_db_fail',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: { userId: 'u_err', email: 'err@example.com' },
    };

    await expect(useCase.execute(envelope)).rejects.toThrow('PostgreSQL connection timeout');
    expect(mockIdempotencyRepo.releaseClaim).toHaveBeenCalledWith('evt_db_fail', expect.any(String));
  });
});

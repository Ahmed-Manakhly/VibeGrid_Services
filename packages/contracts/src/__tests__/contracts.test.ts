import { validateEvent } from '../index';

describe('@vibegrid/contracts', () => {
  it('should successfully validate a valid UserRegisteredV1 event', () => {
    const validEvent = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      eventName: 'user.registered',
      version: 1,
      occurredAt: '2026-09-20T10:00:00.000Z',
      correlationId: 'req-corr-999',
      payload: {
        userId: 'u_100',
        email: 'test@vibegrid.com',
        username: 'testuser',
      },
    };

    const validated = validateEvent(validEvent);
    expect(validated.eventName).toBe('user.registered');
    if (validated.eventName === 'user.registered') {
      expect(validated.payload.userId).toBe('u_100');
    }
  });

  it('should successfully validate email.verification.requested event', () => {
    const validEvent = {
      eventId: '123e4567-e89b-12d3-a456-426614174001',
      eventName: 'email.verification.requested',
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: {
        email: 'user@vibegrid.com',
        otp: '884920',
        expiresInMinutes: 15,
      },
    };

    const validated = validateEvent(validEvent);
    expect(validated.eventName).toBe('email.verification.requested');
  });

  it('should throw contract validation error for malformed event payload', () => {
    const invalidEvent = {
      eventId: 'invalid-uuid',
      eventName: 'user.registered',
      version: 1,
      occurredAt: 'invalid-date',
      payload: {
        userId: 'u_100',
        email: 'not-an-email',
      },
    };

    expect(() => validateEvent(invalidEvent)).toThrow('[Contract Validation Error]');
  });
});

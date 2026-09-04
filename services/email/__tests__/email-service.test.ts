import { EmailMessage } from '../src/domain/value-objects/EmailMessage.vo';
import { ProcessEmailEventUseCase } from '../src/application/use-cases/ProcessEmailEvent.usecase';
import { IEmailProvider } from '../src/domain/ports/IEmailProvider';
import { IIdempotencyRepository } from '../src/domain/ports/IIdempotencyRepository';

describe('EmailMessage Value Object', () => {
  it('should create a valid EmailMessage instance', () => {
    const msg = new EmailMessage({
      to: 'USER@EXAMPLE.COM',
      subject: 'Test Subject',
      html: '<h1>Hello</h1>',
    });

    expect(msg.to).toBe('user@example.com');
    expect(msg.subject).toBe('Test Subject');
    expect(msg.html).toBe('<h1>Hello</h1>');
  });

  it('should throw error on invalid email address', () => {
    expect(() => new EmailMessage({
      to: 'invalid-email',
      subject: 'Test',
      html: '<p>Test</p>',
    })).toThrow('Invalid email recipient address');
  });

  it('should throw error on empty subject or html', () => {
    expect(() => new EmailMessage({
      to: 'user@example.com',
      subject: '',
      html: '<p>Test</p>',
    })).toThrow('Email subject cannot be empty');
  });
});

describe('ProcessEmailEventUseCase', () => {
  let mockProvider: jest.Mocked<IEmailProvider>;
  let mockIdempotency: jest.Mocked<IIdempotencyRepository>;
  let useCase: ProcessEmailEventUseCase;

  beforeEach(() => {
    mockProvider = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    mockIdempotency = {
      acquireClaim: jest.fn().mockResolvedValue(true),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      releaseClaim: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new ProcessEmailEventUseCase(mockProvider, mockIdempotency);
  });

  it('should process user.registered event and send email', async () => {
    const envelope = {
      eventId: 'evt_100',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: {
        userId: 'u_1',
        email: 'alex@example.com',
        name: 'Alex Rivera',
      },
    };

    const result = await useCase.execute(envelope);

    expect(result.success).toBe(true);
    expect(mockIdempotency.acquireClaim).toHaveBeenCalledWith('evt_100', expect.any(String), 300);
    expect(mockProvider.send).toHaveBeenCalledTimes(1);
    expect(mockIdempotency.markCompleted).toHaveBeenCalledWith('evt_100', expect.any(String), 86400);
  });

  it('should skip processing if event is a duplicate claim', async () => {
    mockIdempotency.acquireClaim.mockResolvedValue(false);

    const envelope = {
      eventId: 'evt_dup',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: { email: 'dup@example.com' },
    };

    const result = await useCase.execute(envelope);

    expect(result.success).toBe(true);
    expect(result.skippedDuplicate).toBe(true);
    expect(mockProvider.send).not.toHaveBeenCalled();
  });

  it('should release claim safely on provider delivery failure', async () => {
    mockProvider.send.mockRejectedValue(new Error('SMTP connection failed'));

    const envelope = {
      eventId: 'evt_fail',
      eventName: 'user.registered',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: { email: 'fail@example.com' },
    };

    await expect(useCase.execute(envelope)).rejects.toThrow('SMTP connection failed');
    expect(mockIdempotency.releaseClaim).toHaveBeenCalledWith('evt_fail', expect.any(String));
  });
});

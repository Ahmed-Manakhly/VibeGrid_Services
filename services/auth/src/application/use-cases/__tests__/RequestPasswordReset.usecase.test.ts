import { RequestPasswordResetUseCase } from '../RequestPasswordReset.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../../domain/ports/IEmailTokenRepository';
import { IPasswordHasher } from '../../../domain/ports/IPasswordHasher';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { EmailToken } from '../../../domain/entities/EmailToken.entity';
import { RateLimitError } from '../../errors/errors';

describe('RequestPasswordResetUseCase — CSPRNG OTP Generation', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockEmailTokenRepo: jest.Mocked<IEmailTokenRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockEventPublisher: any;
  let requestPasswordResetUseCase: RequestPasswordResetUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findFirstByRole: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    };

    mockEmailTokenRepo = {
      findByEmail: jest.fn(),
      upsert: jest.fn().mockImplementation((token) => Promise.resolve(token)),
      deleteByEmail: jest.fn().mockResolvedValue(undefined)
    };

    mockPasswordHasher = {
      hash: jest.fn().mockImplementation((val) => Promise.resolve(`hashed_${val}`)),
      verify: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined)
    };

    requestPasswordResetUseCase = new RequestPasswordResetUseCase(
      mockUserAuthRepo,
      mockEmailTokenRepo,
      mockPasswordHasher,
      mockEventPublisher
    );
  });

  it('should generate a 4-digit numeric CSPRNG OTP without using Math.random', async () => {
    const mathRandomSpy = jest.spyOn(Math, 'random');

    const user = UserAuth.create({
      id: 'u1',
      email: 'user@example.com',
      isActive: true
    });

    mockUserAuthRepo.findByEmail.mockResolvedValue(user);
    mockEmailTokenRepo.findByEmail.mockResolvedValue(null);

    const result = await requestPasswordResetUseCase.execute({ email: 'user@example.com' });

    expect(result.message).toBe('OTP sent to your email.');
    expect(mathRandomSpy).not.toHaveBeenCalled();

    expect(mockPasswordHasher.hash).toHaveBeenCalled();
    const generatedOtp = mockPasswordHasher.hash.mock.calls[0][0];

    // Assert OTP is a 4-digit numeric string (1000 - 9999)
    expect(generatedOtp).toMatch(/^\d{4}$/);
    const numericOtp = parseInt(generatedOtp, 10);
    expect(numericOtp).toBeGreaterThanOrEqual(1000);
    expect(numericOtp).toBeLessThanOrEqual(9999);

    expect(mockEmailTokenRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        tokenHash: `hashed_${generatedOtp}`
      })
    );

    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      'password.reset.requested',
      expect.objectContaining({
        payload: expect.objectContaining({
          email: 'user@example.com',
          otp: generatedOtp
        })
      })
    );

    mathRandomSpy.mockRestore();
  });

  it('should enforce rate limiting if an unexpired OTP exists', async () => {
    const user = UserAuth.create({
      id: 'u1',
      email: 'user@example.com',
      isActive: true
    });

    const activeToken = EmailToken.create({
      email: 'user@example.com',
      tokenHash: 'hashed_otp',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    mockUserAuthRepo.findByEmail.mockResolvedValue(user);
    mockEmailTokenRepo.findByEmail.mockResolvedValue(activeToken);

    await expect(
      requestPasswordResetUseCase.execute({ email: 'user@example.com' })
    ).rejects.toThrow(RateLimitError);
  });
});

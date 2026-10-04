import { ResetPasswordUseCase } from '../ResetPassword.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../../domain/ports/IEmailTokenRepository';
import { IPasswordHasher } from '../../../domain/ports/IPasswordHasher';
import { IRevokedTokenRepository } from '../../../domain/ports/IRevokedTokenRepository';
import { EmailToken } from '../../../domain/entities/EmailToken.entity';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { ValidationError, UnauthorizedError } from '../../errors/errors';

describe('ResetPasswordUseCase — Lockout Clearing', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockEmailTokenRepo: jest.Mocked<IEmailTokenRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockRevokedTokenRepo: jest.Mocked<IRevokedTokenRepository>;
  let resetPasswordUseCase: ResetPasswordUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findFirstByRole: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation(async (user: UserAuth) => user),
      update: jest.fn()
    };

    mockEmailTokenRepo = {
      findByEmail: jest.fn(),
      upsert: jest.fn(),
      deleteByEmail: jest.fn().mockResolvedValue(undefined)
    };

    mockPasswordHasher = {
      hash: jest.fn().mockResolvedValue('reset_hashed_password'),
      verify: jest.fn()
    };

    mockRevokedTokenRepo = {
      revoke: jest.fn().mockResolvedValue(undefined),
      isRevoked: jest.fn().mockResolvedValue(false)
    };

    resetPasswordUseCase = new ResetPasswordUseCase(
      mockUserAuthRepo,
      mockEmailTokenRepo,
      mockPasswordHasher,
      mockRevokedTokenRepo
    );
  });

  const email = 'user@example.com';
  const newPassword = 'NewResetPassword123!';
  const otp = '1234';

  const validEmailToken = EmailToken.create({
    email,
    tokenHash: 'hashed_otp_token',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const lockedUser = UserAuth.create({
    id: 'user_1',
    email,
    passwordHash: 'old_hash',
    role: 'CLIENT',
    isActive: true,
    failedAttempts: 10,
    lockoutUntil: new Date(Date.now() + 15 * 60 * 1000)
  });

  it('should successfully reset password, clear failedAttempts, and clear lockoutUntil', async () => {
    mockEmailTokenRepo.findByEmail.mockResolvedValue(validEmailToken);
    mockPasswordHasher.verify.mockResolvedValue(true);
    mockUserAuthRepo.findByEmail.mockResolvedValue(lockedUser);

    const result = await resetPasswordUseCase.execute({
      email,
      otp,
      newPassword,
      confirmPassword: newPassword
    });

    expect(result.message).toContain('reset successfully');
    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.failedAttempts).toBe(0);
    expect(savedUser.lockoutUntil).toBeUndefined();
    expect(savedUser.isLockedOut()).toBe(false);

    expect(mockEmailTokenRepo.deleteByEmail).toHaveBeenCalledWith(email);
  });

  it('should throw ValidationError on password confirmation mismatch', async () => {
    await expect(
      resetPasswordUseCase.execute({
        email,
        otp,
        newPassword,
        confirmPassword: 'MismatchPassword123!'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw UnauthorizedError on invalid OTP code', async () => {
    mockEmailTokenRepo.findByEmail.mockResolvedValue(validEmailToken);
    mockPasswordHasher.verify.mockResolvedValue(false);

    await expect(
      resetPasswordUseCase.execute({
        email,
        otp: '9999',
        newPassword,
        confirmPassword: newPassword
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should allow bypass reset password when fixedSeedOtp matches', async () => {
    const bypassUseCase = new ResetPasswordUseCase(
      mockUserAuthRepo,
      mockEmailTokenRepo,
      mockPasswordHasher,
      mockRevokedTokenRepo,
      '123456'
    );

    mockUserAuthRepo.findByEmail.mockResolvedValue(lockedUser);

    const result = await bypassUseCase.execute({
      email,
      otp: '123456',
      newPassword,
      confirmPassword: newPassword
    });

    expect(result.message).toContain('reset successfully');
    expect(mockUserAuthRepo.save).toHaveBeenCalled();
  });
});

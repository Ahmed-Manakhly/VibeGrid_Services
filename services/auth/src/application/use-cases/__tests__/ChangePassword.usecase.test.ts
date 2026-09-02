import { ChangePasswordUseCase } from '../ChangePassword.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../../domain/ports/IPasswordHasher';
import { IRevokedTokenRepository } from '../../../domain/ports/IRevokedTokenRepository';
import { IRefreshTokenRepo } from '../../../domain/ports/IRefreshTokenRepo';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { ValidationError, UnauthorizedError } from '../../errors/errors';

describe('ChangePasswordUseCase — Consistency & Validation', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockHasher: jest.Mocked<IPasswordHasher>;
  let mockRevokedTokenRepo: jest.Mocked<IRevokedTokenRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepo>;
  let changePasswordUseCase: ChangePasswordUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation(async (user: UserAuth) => user),
      update: jest.fn()
    };

    mockHasher = {
      hash: jest.fn().mockResolvedValue('new_hashed_password_123'),
      verify: jest.fn()
    };

    mockRevokedTokenRepo = {
      revoke: jest.fn().mockResolvedValue(undefined),
      isRevoked: jest.fn().mockResolvedValue(false)
    };

    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn().mockResolvedValue(undefined)
    };

    changePasswordUseCase = new ChangePasswordUseCase(
      mockUserAuthRepo,
      mockHasher,
      mockRevokedTokenRepo,
      mockRefreshTokenRepo
    );
  });

  const validPassword = 'OldPassword123!';
  const newComplexPassword = 'NewPassword123!';

  const activeUser = UserAuth.create({
    id: 'user_1',
    email: 'test@example.com',
    passwordHash: 'old_hash',
    role: 'CLIENT',
    isActive: true
  });

  it('should throw ValidationError if passwordConfirm is missing', async () => {
    await expect(
      changePasswordUseCase.execute({
        userId: 'user_1',
        currentPassword: validPassword,
        newPassword: newComplexPassword,
        passwordConfirm: ''
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if newPassword and passwordConfirm do not match', async () => {
    await expect(
      changePasswordUseCase.execute({
        userId: 'user_1',
        currentPassword: validPassword,
        newPassword: newComplexPassword,
        passwordConfirm: 'DifferentPassword123!'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should reject password change for inactive user', async () => {
    const inactiveUser = UserAuth.create({
      id: 'user_1',
      email: 'test@example.com',
      passwordHash: 'old_hash',
      role: 'CLIENT',
      isActive: false
    });

    mockUserAuthRepo.findById.mockResolvedValue(inactiveUser);

    await expect(
      changePasswordUseCase.execute({
        userId: 'user_1',
        currentPassword: validPassword,
        newPassword: newComplexPassword,
        passwordConfirm: newComplexPassword
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should successfully update password, update passwordChangedAt, and revoke tokens on valid change', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(activeUser);
    mockHasher.verify.mockResolvedValue(true);

    const oldChangedAt = activeUser.passwordChangedAt;

    await changePasswordUseCase.execute({
      userId: 'user_1',
      currentPassword: validPassword,
      newPassword: newComplexPassword,
      passwordConfirm: newComplexPassword,
      accessToken: 'acc_token_123',
      refreshToken: 'family_123:raw_refresh_123'
    });

    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.passwordHash).toBe('new_hashed_password_123');
    expect(savedUser.passwordChangedAt).not.toEqual(oldChangedAt);

    expect(mockRevokedTokenRepo.revoke).toHaveBeenCalledTimes(2);
    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith('family_123');
  });
});

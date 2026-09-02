import { AuthenticateUseCase } from '../Authenticate.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IRefreshTokenRepo } from '../../../domain/ports/IRefreshTokenRepo';
import { IPasswordHasher } from '../../../domain/ports/IPasswordHasher';
import { ITokenSigner } from '../../../domain/ports/ITokenSigner';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { InvalidCredentialsError, AccountLockedError } from '../../errors/errors';

describe('AuthenticateUseCase — Brute-Force Lockout', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepo>;
  let mockHasher: jest.Mocked<IPasswordHasher>;
  let mockTokenSigner: jest.Mocked<ITokenSigner>;
  let authenticateUseCase: AuthenticateUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation(async (user: UserAuth) => user),
      update: jest.fn()
    };

    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined as any),
      revokeFamily: jest.fn()
    };

    mockHasher = {
      hash: jest.fn(),
      verify: jest.fn()
    };

    mockTokenSigner = {
      signAccessToken: jest.fn().mockReturnValue('mock_access_token'),
      verifyAccessToken: jest.fn(),
      getPublicKey: jest.fn()
    };

    authenticateUseCase = new AuthenticateUseCase(
      mockUserAuthRepo,
      mockRefreshTokenRepo,
      mockHasher,
      mockTokenSigner
    );
  });

  const testUser = UserAuth.create({
    id: 'user_123',
    email: 'user@example.com',
    passwordHash: 'hashed_secret_password',
    role: 'CLIENT',
    isActive: true,
    failedAttempts: 0
  });

  it('should successfully authenticate valid user and issue tokens', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(testUser);
    mockHasher.verify.mockResolvedValue(true);

    const result = await authenticateUseCase.execute({
      email: 'user@example.com',
      password: 'CorrectPassword123!'
    });

    expect(result.accessToken).toBe('mock_access_token');
    expect(result.user.id).toBe('user_123');
  });

  it('should increment failedAttempts on wrong password and throw InvalidCredentialsError', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(testUser);
    mockHasher.verify.mockResolvedValue(false);

    await expect(
      authenticateUseCase.execute({
        email: 'user@example.com',
        password: 'WrongPassword'
      })
    ).rejects.toThrow(InvalidCredentialsError);

    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.failedAttempts).toBe(1);
    expect(savedUser.isLockedOut()).toBe(false);
  });

  it('should lock account on 10th failed attempt and throw AccountLockedError', async () => {

    const userWith9Failures = UserAuth.create({
      id: 'user_123',
      email: 'user@example.com',
      passwordHash: 'hashed_secret_password',
      role: 'CLIENT',
      isActive: true,
      failedAttempts: 9
    });

    mockUserAuthRepo.findByEmail.mockResolvedValue(userWith9Failures);
    mockHasher.verify.mockResolvedValue(false);

    await expect(
      authenticateUseCase.execute({
        email: 'user@example.com',
        password: 'WrongPassword'
      })
    ).rejects.toThrow(AccountLockedError);

    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.failedAttempts).toBe(10);
    expect(savedUser.isLockedOut()).toBe(true);
    expect(savedUser.lockoutUntil).toBeDefined();
  });

  it('should reject login immediately while account is locked out', async () => {
    const lockedUser = UserAuth.create({
      id: 'user_123',
      email: 'user@example.com',
      passwordHash: 'hashed_secret_password',
      role: 'CLIENT',
      isActive: true,
      failedAttempts: 10,
      lockoutUntil: new Date(Date.now() + 10 * 60 * 1000) // Locked for 10 more mins
    });

    mockUserAuthRepo.findByEmail.mockResolvedValue(lockedUser);

    await expect(
      authenticateUseCase.execute({
        email: 'user@example.com',
        password: 'CorrectPassword123!'
      })
    ).rejects.toThrow(AccountLockedError);

    expect(mockHasher.verify).not.toHaveBeenCalled();
  });

  it('should automatically unlock expired lockout and allow successful login', async () => {
    const expiredLockUser = UserAuth.create({
      id: 'user_123',
      email: 'user@example.com',
      passwordHash: 'hashed_secret_password',
      role: 'CLIENT',
      isActive: true,
      failedAttempts: 10,
      lockoutUntil: new Date(Date.now() - 60 * 1000) // Expired 1 min ago
    });

    mockUserAuthRepo.findByEmail.mockResolvedValue(expiredLockUser);
    mockHasher.verify.mockResolvedValue(true);

    const result = await authenticateUseCase.execute({
      email: 'user@example.com',
      password: 'CorrectPassword123!'
    });

    expect(result.accessToken).toBe('mock_access_token');
    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.failedAttempts).toBe(0);
    expect(savedUser.lockoutUntil).toBeUndefined();
  });

  it('should reset failedAttempts and clear lockoutUntil on successful login', async () => {
    const userWithFailures = UserAuth.create({
      id: 'user_123',
      email: 'user@example.com',
      passwordHash: 'hashed_secret_password',
      role: 'CLIENT',
      isActive: true,
      failedAttempts: 5
    });

    mockUserAuthRepo.findByEmail.mockResolvedValue(userWithFailures);
    mockHasher.verify.mockResolvedValue(true);

    const result = await authenticateUseCase.execute({
      email: 'user@example.com',
      password: 'CorrectPassword123!'
    });

    expect(result.accessToken).toBe('mock_access_token');
    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.failedAttempts).toBe(0);
    expect(savedUser.lockoutUntil).toBeUndefined();
  });
});

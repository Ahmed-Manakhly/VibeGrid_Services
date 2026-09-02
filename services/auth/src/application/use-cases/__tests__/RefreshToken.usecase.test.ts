import { RefreshTokenUseCase } from '../RefreshToken.usecase';
import { IRefreshTokenRepo } from '../../../domain/ports/IRefreshTokenRepo';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { ITokenSigner } from '../../../domain/ports/ITokenSigner';
import { RefreshToken } from '../../../domain/entities/RefreshToken.entity';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { UnauthorizedError, UserNotFoundError } from '../../errors/errors';
import crypto from 'crypto';

describe('RefreshTokenUseCase — Hardening Checks', () => {
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepo>;
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockTokenSigner: jest.Mocked<ITokenSigner>;
  let refreshTokenUseCase: RefreshTokenUseCase;

  let validTokenEntity: RefreshToken;
  let activeUser: UserAuth;

  const familyId = 'family_123';
  const rawToken = 'raw_refresh_token_hex_123';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const fullRefreshToken = `${familyId}:${rawToken}`;

  beforeEach(() => {
    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn().mockImplementation(async (token: RefreshToken) => token),
      revokeFamily: jest.fn().mockResolvedValue(undefined)
    };

    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findFirstByRole: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    };

    mockTokenSigner = {
      signAccessToken: jest.fn().mockReturnValue('new_access_token_abc'),
      verifyAccessToken: jest.fn(),
      getPublicKey: jest.fn()
    };

    refreshTokenUseCase = new RefreshTokenUseCase(
      mockRefreshTokenRepo,
      mockUserAuthRepo,
      mockTokenSigner
    );

    const now = new Date();
    const tokenCreatedAt = new Date(now.getTime() - 10 * 60 * 1000); // Created 10 mins ago

    validTokenEntity = RefreshToken.create({
      id: 'db_token_1',
      userId: 'user_1',
      tokenHash,
      familyId,
      role: 'CLIENT',
      isRevoked: false,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: tokenCreatedAt
    });

    activeUser = UserAuth.create({
      id: 'user_1',
      email: 'test@example.com',
      role: 'CLIENT',
      isActive: true,
      passwordChangedAt: new Date(now.getTime() - 30 * 60 * 1000)
    });
  });

  it('should successfully rotate tokens for valid user and active session', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(validTokenEntity);
    mockUserAuthRepo.findById.mockResolvedValue(activeUser);

    const result = await refreshTokenUseCase.execute(fullRefreshToken);

    expect(result.accessToken).toBe('new_access_token_abc');
    expect(result.refreshToken).toContain(`${familyId}:`);
    expect(mockRefreshTokenRepo.save).toHaveBeenCalled();
  });

  it('should reject refresh and revoke family if user account is inactive', async () => {
    const inactiveUser = UserAuth.create({
      id: 'user_1',
      email: 'test@example.com',
      role: 'CLIENT',
      isActive: false
    });

    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(validTokenEntity);
    mockUserAuthRepo.findById.mockResolvedValue(inactiveUser);

    await expect(refreshTokenUseCase.execute(fullRefreshToken)).rejects.toThrow(UnauthorizedError);

    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith(familyId);
  });

  it('should reject refresh and revoke family if password was changed after token issuance', async () => {
    const now = new Date();
    const userWithRecentPasswordChange = UserAuth.create({
      id: 'user_1',
      email: 'test@example.com',
      role: 'CLIENT',
      isActive: true,
      passwordChangedAt: new Date(now.getTime() - 2 * 60 * 1000) // Changed 2 mins ago (AFTER token created 10 mins ago)
    });

    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(validTokenEntity);
    mockUserAuthRepo.findById.mockResolvedValue(userWithRecentPasswordChange);

    await expect(refreshTokenUseCase.execute(fullRefreshToken)).rejects.toThrow(UnauthorizedError);

    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith(familyId);
  });

  it('should reject refresh and revoke family if user role has drifted', async () => {
    const userWithUpdatedRole = UserAuth.create({
      id: 'user_1',
      email: 'test@example.com',
      role: 'ADMIN', // Changed from CLIENT to ADMIN
      isActive: true
    });

    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(validTokenEntity);
    mockUserAuthRepo.findById.mockResolvedValue(userWithUpdatedRole);

    await expect(refreshTokenUseCase.execute(fullRefreshToken)).rejects.toThrow(UnauthorizedError);

    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith(familyId);
  });

  it('should revoke family if user no longer exists', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(validTokenEntity);
    mockUserAuthRepo.findById.mockResolvedValue(null);

    await expect(refreshTokenUseCase.execute(fullRefreshToken)).rejects.toThrow(UserNotFoundError);

    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith(familyId);
  });

  it('should revoke family on token reuse (revoked token attempt)', async () => {
    const now = new Date();
    const revokedTokenEntity = RefreshToken.create({
      id: 'db_token_1',
      userId: 'user_1',
      tokenHash,
      familyId,
      role: 'CLIENT',
      isRevoked: true, // Already revoked!
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    });

    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(revokedTokenEntity);

    await expect(refreshTokenUseCase.execute(fullRefreshToken)).rejects.toThrow(UnauthorizedError);

    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith(familyId);
  });
});

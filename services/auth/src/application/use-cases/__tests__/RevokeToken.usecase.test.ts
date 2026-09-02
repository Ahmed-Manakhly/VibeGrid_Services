import { RevokeTokenUseCase } from '../RevokeToken.usecase';
import { IRevokedTokenRepository } from '../../../domain/ports/IRevokedTokenRepository';
import { IRefreshTokenRepo } from '../../../domain/ports/IRefreshTokenRepo';

describe('RevokeTokenUseCase — Logout Refresh Revocation', () => {
  let mockRevokedTokenRepo: jest.Mocked<IRevokedTokenRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepo>;
  let revokeTokenUseCase: RevokeTokenUseCase;

  beforeEach(() => {
    mockRevokedTokenRepo = {
      revoke: jest.fn().mockResolvedValue(undefined),
      isRevoked: jest.fn().mockResolvedValue(false)
    };

    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn().mockResolvedValue(undefined)
    };

    revokeTokenUseCase = new RevokeTokenUseCase(mockRevokedTokenRepo, mockRefreshTokenRepo);
  });

  it('should revoke access token in RevokedToken repository', async () => {
    await revokeTokenUseCase.execute({
      token: 'access_token_123',
      type: 'ACCESS',
      expiresAt: new Date()
    });

    expect(mockRevokedTokenRepo.revoke).toHaveBeenCalled();
    expect(mockRefreshTokenRepo.revokeFamily).not.toHaveBeenCalled();
  });

  it('should revoke refresh token in RevokedToken repo AND revoke family in RefreshToken repo', async () => {
    const familyId = 'family_abc_123';
    const rawToken = 'raw_token_xyz';
    const fullRefreshToken = `${familyId}:${rawToken}`;

    await revokeTokenUseCase.execute({
      token: fullRefreshToken,
      type: 'REFRESH',
      expiresAt: new Date()
    });

    expect(mockRevokedTokenRepo.revoke).toHaveBeenCalled();
    expect(mockRefreshTokenRepo.revokeFamily).toHaveBeenCalledWith(familyId);
  });

  it('should handle missing token gracefully without throwing error', async () => {
    await expect(
      revokeTokenUseCase.execute({
        token: '',
        type: 'REFRESH',
        expiresAt: new Date()
      })
    ).resolves.not.toThrow();

    expect(mockRevokedTokenRepo.revoke).not.toHaveBeenCalled();
  });
});

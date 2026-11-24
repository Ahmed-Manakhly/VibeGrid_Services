import { OAuthLoginUseCase } from '../OAuthLogin.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IRefreshTokenRepo } from '../../../domain/ports/IRefreshTokenRepo';
import { IEventPublisher } from '../../../domain/ports/IEventPublisher';
import { ITokenSigner } from '../../../domain/ports/ITokenSigner';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';

describe('OAuthLoginUseCase', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockRefreshTokenRepo: jest.Mocked<IRefreshTokenRepo>;
  let mockEventPublisher: jest.Mocked<IEventPublisher>;
  let mockTokenSigner: jest.Mocked<ITokenSigner>;
  let oAuthLoginUseCase: OAuthLoginUseCase;

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

    mockRefreshTokenRepo = {
      save: jest.fn(),
      findByTokenHash: jest.fn(),
      revokeFamily: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn()
    };

    mockTokenSigner = {
      getPublicKey: jest.fn().mockReturnValue('mock_pub_key'),
      signAccessToken: jest.fn().mockReturnValue('mock_access_token'),
      verifyAccessToken: jest.fn().mockReturnValue({ sub: '123' })
    };

    oAuthLoginUseCase = new OAuthLoginUseCase(
      mockUserAuthRepo,
      mockRefreshTokenRepo,
      mockEventPublisher,
      mockTokenSigner
    );
  });

  it('should authenticate existing user matched by provider and providerId', async () => {
    const existingUser = UserAuth.create({
      email: 'oauth_user@github.com',
      name: 'GitHub User',
      provider: 'github',
      providerId: 'gh_12345'
    });
    mockUserAuthRepo.findByProvider.mockResolvedValue(existingUser);

    const result = await oAuthLoginUseCase.execute({
      provider: 'github',
      providerId: 'gh_12345',
      email: 'oauth_user@github.com',
      name: 'GitHub User'
    });

    expect(mockUserAuthRepo.findByProvider).toHaveBeenCalledWith('github', 'gh_12345');
    expect(mockTokenSigner.signAccessToken).toHaveBeenCalled();
    expect(mockRefreshTokenRepo.save).toHaveBeenCalled();
    expect(mockEventPublisher.publish).not.toHaveBeenCalled(); // not a new user
    expect(result.accessToken).toBe('mock_access_token');
    expect(result.user.email).toBe('oauth_user@github.com');
  });

  it('should register brand new user and publish UserRegisteredEvent if neither provider nor email exists', async () => {
    mockUserAuthRepo.findByProvider.mockResolvedValue(null);
    mockUserAuthRepo.findByEmail.mockResolvedValue(null);

    const result = await oAuthLoginUseCase.execute({
      provider: 'google',
      providerId: 'goog_99999',
      email: 'new_google_user@gmail.com',
      name: 'Google User'
    });

    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      'user.registered',
      expect.objectContaining({
        email: 'new_google_user@gmail.com',
        provider: 'google'
      })
    );
    expect(result.accessToken).toBe('mock_access_token');
    expect(result.user.email).toBe('new_google_user@gmail.com');
  });

  it('should link provider to existing user if email exists but provider was not linked yet', async () => {
    const existingUser = UserAuth.create({
      email: 'existing_user@vibegrid.tech',
      name: 'Existing User'
    });
    mockUserAuthRepo.findByProvider.mockResolvedValue(null);
    mockUserAuthRepo.findByEmail.mockResolvedValue(existingUser);

    const result = await oAuthLoginUseCase.execute({
      provider: 'github',
      providerId: 'gh_77777',
      email: 'existing_user@vibegrid.tech',
      name: 'Existing User'
    });

    expect(mockUserAuthRepo.save).toHaveBeenCalledWith(existingUser);
    expect(mockEventPublisher.publish).not.toHaveBeenCalled(); // Not new, existing account
    expect(result.accessToken).toBe('mock_access_token');
    expect(result.user.email).toBe('existing_user@vibegrid.tech');
  });
});

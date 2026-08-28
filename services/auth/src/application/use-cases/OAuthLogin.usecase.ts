import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { UserAuth } from '../../domain/entities/UserAuth.entity';
import { UserRegisteredEvent } from '../../domain/events/UserRegistered.event';
import { OAuthDTO, AuthTokensDTO } from '../dtos/auth.dtos';
import { ITokenSigner } from '../../domain/ports/ITokenSigner';
import { RefreshToken } from '../../domain/entities/RefreshToken.entity';
import crypto from 'crypto';

export class OAuthLoginUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private refreshTokenRepo: IRefreshTokenRepo,
    private eventPublisher: IEventPublisher,
    private tokenSigner: ITokenSigner
  ) {}

  async execute(dto: OAuthDTO): Promise<AuthTokensDTO> {
    let user = await this.userAuthRepo.findByProvider(dto.provider, dto.providerId);
    let isNewUser = false;

    if (!user) {
      // Check if user exists by email
      user = await this.userAuthRepo.findByEmail(dto.email);
      if (!user) {
        // Create new user aggregate
        user = UserAuth.create({
          email: dto.email,
          name: dto.name,
          provider: dto.provider,
          providerId: dto.providerId
        });
        isNewUser = true;
      }
      user = await this.userAuthRepo.save(user);
    }

    const userId = user.id!;

    // Issue RS256 Access Token
    const accessToken = this.tokenSigner.signAccessToken({
      sub: userId,
      email: user.email,
      role: user.role
    });

    // Issue Refresh Token & Store in Mongo
    const familyId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const refreshTokenEntity = RefreshToken.create({
      userId,
      tokenHash,
      familyId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await this.refreshTokenRepo.save(refreshTokenEntity);

    // Publish event if brand new OAuth user
    if (isNewUser) {
      const registeredEvent = new UserRegisteredEvent({
        userId,
        email: user.email,
        name: user.name,
        provider: dto.provider,
        registeredAt: new Date(),
        version: 1
      });
      await this.eventPublisher.publish(registeredEvent.eventName, registeredEvent.payload);
    }

    return {
      accessToken,
      refreshToken: `${familyId}:${rawRefreshToken}`,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }
}

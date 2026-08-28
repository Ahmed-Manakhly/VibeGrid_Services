import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { UserAuth } from '../../domain/entities/UserAuth.entity';
import { UserRegisteredEvent } from '../../domain/events/UserRegistered.event';
import { RegisterDTO, AuthTokensDTO } from '../dtos/auth.dtos';
import { ITokenSigner } from '../../domain/ports/ITokenSigner';
import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { RefreshToken } from '../../domain/entities/RefreshToken.entity';
import crypto from 'crypto';

import { DuplicateEmailError } from '../errors/errors';

export class RegisterUserUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private refreshTokenRepo: IRefreshTokenRepo,
    private hasher: IPasswordHasher,
    private eventPublisher: IEventPublisher,
    private tokenSigner: ITokenSigner
  ) {}

  async execute(dto: RegisterDTO): Promise<AuthTokensDTO> {
    const existing = await this.userAuthRepo.findByEmail(dto.email);
    if (existing) {
      throw new DuplicateEmailError('Email already registered');
    }

    const hashedPassword = await this.hasher.hash(dto.password);
    const newUser = UserAuth.create({
      email: dto.email,
      passwordHash: hashedPassword,
      name: dto.name,
      provider: 'local'
    });

    const savedUser = await this.userAuthRepo.save(newUser);
    const userId = savedUser.id!;

    // Issue RS256 Access Token
    const accessToken = this.tokenSigner.signAccessToken({
      sub: userId,
      email: savedUser.email,
      role: savedUser.role
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await this.refreshTokenRepo.save(refreshTokenEntity);

    // Publish Event-Driven Message (Pub/Sub)
    const registeredEvent = new UserRegisteredEvent({
      userId,
      email: savedUser.email,
      name: savedUser.name,
      provider: 'local',
      registeredAt: new Date(),
      version: 1
    });

    await this.eventPublisher.publish(registeredEvent.eventName, registeredEvent.payload);

    return {
      accessToken,
      refreshToken: `${familyId}:${rawRefreshToken}`,
      user: {
        id: userId,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role
      }
    };
  }
}

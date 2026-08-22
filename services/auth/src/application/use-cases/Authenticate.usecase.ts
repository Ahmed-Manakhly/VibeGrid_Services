import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { LoginDTO, AuthTokensDTO } from '../dtos/auth.dtos';
import { RS256TokenSigner } from '../../infrastructure/security/RS256TokenSigner';
import { RefreshToken } from '../../domain/entities/RefreshToken.entity';
import crypto from 'crypto';

export class AuthenticateUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private refreshTokenRepo: IRefreshTokenRepo,
    private hasher: IPasswordHasher,
    private tokenSigner: RS256TokenSigner
  ) {}

  async execute(dto: LoginDTO): Promise<AuthTokensDTO> {
    const user = await this.userAuthRepo.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isValid = await this.hasher.verify(dto.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
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

import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { LoginDTO, AuthTokensDTO } from '../dtos/auth.dtos';
import { ITokenSigner } from '../../domain/ports/ITokenSigner';
import { RefreshToken } from '../../domain/entities/RefreshToken.entity';
import crypto from 'crypto';

import { InvalidCredentialsError, AccountLockedError, UnauthorizedError } from '../errors/errors';

export class AuthenticateUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private refreshTokenRepo: IRefreshTokenRepo,
    private hasher: IPasswordHasher,
    private tokenSigner: ITokenSigner,
    private refreshTokenTTLMs: number = 7 * 24 * 60 * 60 * 1000
  ) {}

  async execute(dto: LoginDTO): Promise<AuthTokensDTO> {
    const normalizedEmail = dto.email ? dto.email.trim().toLowerCase() : '';
    const user = await this.userAuthRepo.findByEmail(normalizedEmail);
    if (!user || !user.passwordHash || user.isDeleted) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    const now = new Date();
    let wasLockoutReset = false;

    // 1. Lockout check (reject if active lock)
    if (user.isLockedOut(now)) {
      throw new AccountLockedError('Account is locked due to too many failed attempts. Please try again later.');
    }

    // 2. Auto-unlock if lockout timer has expired
    if (user.lockoutUntil && user.lockoutUntil <= now) {
      user.resetLockout();
      wasLockoutReset = true;
    }

    // 3. Active status check
    if (!user.isActive) {
      throw new AccountLockedError('Account is locked. Please contact support.');
    }

    // 4. Password verification
    const isValid = await this.hasher.verify(dto.password, user.passwordHash);
    if (!isValid) {
      user.recordFailedAttempt(now);
      await this.userAuthRepo.save(user);

      if (user.isLockedOut(now)) {
        throw new AccountLockedError('Account has been locked due to 10 failed login attempts. Please try again in 15 minutes.');
      }

      throw new InvalidCredentialsError('Invalid email or password');
    }

    // 5. Email verification check for local accounts
    if (user.provider === 'local' && !user.isEmailVerified) {
      throw new UnauthorizedError('Email address is not verified. Please verify your email before logging in.');
    }

    // 5. Reset lockout state on successful authentication if previously incremented or auto-unlocked
    if (wasLockoutReset || user.failedAttempts > 0 || user.lockoutUntil) {
      user.resetLockout();
      await this.userAuthRepo.save(user);
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
      role: user.role,
      isRevoked: false,
      expiresAt: new Date(Date.now() + this.refreshTokenTTLMs)
    });

    await this.refreshTokenRepo.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: `${familyId}:${rawRefreshToken}`,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPolicyAccepted: user.isPolicyAccepted
      }
    };
  }
}

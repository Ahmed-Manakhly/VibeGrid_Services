import { IRevokedTokenRepository } from '../../domain/ports/IRevokedTokenRepository';
import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { RevokedToken } from '../../domain/entities/RevokedToken.entity';

export interface RevokeTokenInput {
  token: string;
  type: 'ACCESS' | 'REFRESH';
  expiresAt: Date;
}

export class RevokeTokenUseCase {
  constructor(
    private revokedTokenRepo: IRevokedTokenRepository,
    private refreshTokenRepo?: IRefreshTokenRepo
  ) {}

  public async execute(input: RevokeTokenInput): Promise<void> {
    if (!input.token) return;

    const revokedToken = RevokedToken.create({
      token: input.token,
      type: input.type,
      expiresAt: input.expiresAt
    });

    await this.revokedTokenRepo.revoke(revokedToken);

    if (input.type === 'REFRESH' && this.refreshTokenRepo) {
      const parts = input.token.split(':');
      if (parts.length === 2) {
        const [familyId] = parts;
        await this.refreshTokenRepo.revokeFamily(familyId);
      }
    }
  }
}

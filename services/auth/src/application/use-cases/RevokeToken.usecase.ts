import { IRevokedTokenRepository } from '../../domain/ports/IRevokedTokenRepository';
import { RevokedToken } from '../../domain/entities/RevokedToken.entity';

export interface RevokeTokenInput {
  token: string;
  type: 'ACCESS' | 'REFRESH';
  expiresAt: Date;
}

export class RevokeTokenUseCase {
  constructor(private revokedTokenRepo: IRevokedTokenRepository) {}

  public async execute(input: RevokeTokenInput): Promise<void> {
    if (!input.token) return;

    const revokedToken = RevokedToken.create({
      token: input.token,
      type: input.type,
      expiresAt: input.expiresAt
    });

    await this.revokedTokenRepo.revoke(revokedToken);
  }
}

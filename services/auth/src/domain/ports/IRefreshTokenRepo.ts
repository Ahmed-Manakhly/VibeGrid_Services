import { RefreshToken } from '../entities/RefreshToken.entity';

export interface IRefreshTokenRepo {
  save(token: RefreshToken): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeFamily(familyId: string): Promise<void>;
}

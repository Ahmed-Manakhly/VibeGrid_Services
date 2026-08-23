import { RevokedToken } from '../entities/RevokedToken.entity';

export interface IRevokedTokenRepository {
  revoke(token: RevokedToken): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
}

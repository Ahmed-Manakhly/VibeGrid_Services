import { IRevokedTokenRepository } from '../../domain/ports/IRevokedTokenRepository';
import { RevokedToken } from '../../domain/entities/RevokedToken.entity';
import { RevokedTokenModel } from './schemas/RevokedTokenSchema';

export class MongoRevokedTokenRepo implements IRevokedTokenRepository {
  public async revoke(token: RevokedToken): Promise<void> {
    await RevokedTokenModel.create({
      token: token.token,
      type: token.type,
      revokedAt: token.revokedAt,
      expiresAt: token.expiresAt
    });
  }

  public async isRevoked(token: string): Promise<boolean> {
    const doc = await RevokedTokenModel.findOne({ token }).lean();
    return !!doc;
  }
}

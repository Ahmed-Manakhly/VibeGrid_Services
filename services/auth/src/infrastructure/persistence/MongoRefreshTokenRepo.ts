import { IRefreshTokenRepo } from '../../domain/ports/IRefreshTokenRepo';
import { RefreshToken } from '../../domain/entities/RefreshToken.entity';
import { RefreshTokenModel, IRefreshTokenDocument } from './schemas/RefreshTokenSchema';

export class MongoRefreshTokenRepo implements IRefreshTokenRepo {
  private toDomain(doc: IRefreshTokenDocument & { _id: any }): RefreshToken {
    return RefreshToken.create({
      id: doc._id.toString(),
      userId: doc.userId,
      tokenHash: doc.tokenHash,
      familyId: doc.familyId,
      role: doc.role,
      isRevoked: doc.isRevoked,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt
    });
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    if (token.id) {
      const doc = await RefreshTokenModel.findByIdAndUpdate(
        token.id,
        { isRevoked: token.isRevoked },
        { new: true }
      ).exec();
      return this.toDomain(doc!);
    } else {
      const doc = await RefreshTokenModel.create({
        userId: token.userId,
        tokenHash: token.tokenHash,
        familyId: token.familyId,
        role: token.role,
        isRevoked: token.isRevoked,
        expiresAt: token.expiresAt
      });
      return this.toDomain(doc);
    }
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ familyId }, { isRevoked: true }).exec();
  }
}

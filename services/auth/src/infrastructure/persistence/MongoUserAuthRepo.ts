import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../domain/entities/UserAuth.entity';
import { UserAuthModel, IUserAuthDocument } from './schemas/UserAuthSchema';

export class MongoUserAuthRepo implements IUserAuthRepository {
  private toDomain(doc: IUserAuthDocument): UserAuth {
    return UserAuth.create({
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      provider: doc.provider as any,
      providerId: doc.providerId,
      role: doc.role,
      isActive: doc.isActive,
      passwordChangedAt: doc.passwordChangedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }

  async findByEmail(email: string): Promise<UserAuth | null> {
    const doc = await UserAuthModel.findOne({ email }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string): Promise<UserAuth | null> {
    const doc = await UserAuthModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByProvider(provider: string, providerId: string): Promise<UserAuth | null> {
    const doc = await UserAuthModel.findOne({ provider, providerId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(userAuth: UserAuth): Promise<UserAuth> {
    if (userAuth.id) {
      const doc = await UserAuthModel.findByIdAndUpdate(
        userAuth.id,
        {
          email: userAuth.email,
          passwordHash: userAuth.passwordHash,
          name: userAuth.name,
          provider: userAuth.provider,
          providerId: userAuth.providerId,
          role: userAuth.role
        },
        { new: true }
      ).exec();
      return this.toDomain(doc!);
    } else {
      const doc = await UserAuthModel.create({
        email: userAuth.email,
        passwordHash: userAuth.passwordHash,
        name: userAuth.name,
        provider: userAuth.provider,
        providerId: userAuth.providerId,
        role: userAuth.role
      });
      return this.toDomain(doc);
    }
  }
}

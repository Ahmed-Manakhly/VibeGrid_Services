import { IUserAuthRepository, FindAllUsersQuery, PaginatedUsersResult } from '../../domain/ports/IUserAuthRepository';
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

  async findAll(query?: FindAllUsersQuery): Promise<PaginatedUsersResult> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.max(1, Math.min(100, query?.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [docs, total] = await Promise.all([
      UserAuthModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      UserAuthModel.countDocuments(filter).exec()
    ]);

    return {
      users: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
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
          role: userAuth.role,
          isActive: userAuth.isActive,
          passwordChangedAt: userAuth.passwordChangedAt
        },
        { new: true }
      ).exec();
      return this.toDomain(doc!);
    }

    const doc = await UserAuthModel.create({
      email: userAuth.email,
      passwordHash: userAuth.passwordHash,
      name: userAuth.name,
      provider: userAuth.provider,
      providerId: userAuth.providerId,
      role: userAuth.role,
      isActive: userAuth.isActive,
      passwordChangedAt: userAuth.passwordChangedAt
    });
    return this.toDomain(doc);
  }

  async update(userAuth: UserAuth): Promise<UserAuth> {
    return this.save(userAuth);
  }
}

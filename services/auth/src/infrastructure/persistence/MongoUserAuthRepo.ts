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
      isEmailVerified: doc.isEmailVerified,
      emailVerifiedAt: doc.emailVerifiedAt,
      isPolicyAccepted: doc.isPolicyAccepted,
      policyAcceptedAt: doc.policyAcceptedAt,
      passwordChangedAt: doc.passwordChangedAt,
      failedAttempts: doc.failedAttempts,
      lockoutUntil: doc.lockoutUntil,
      deletedAt: doc.deletedAt,
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

  async findFirstByRole(role: string): Promise<UserAuth | null> {
    const doc = await UserAuthModel.findOne({ role }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(query?: FindAllUsersQuery): Promise<PaginatedUsersResult> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.max(1, Math.min(100, query?.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    };

    // 1. Search filter
    if (query?.search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { email: { $regex: query.search, $options: 'i' } },
          { name: { $regex: query.search, $options: 'i' } }
        ]
      });
    }

    // 2. Role filter (whitelisted)
    const allowedRoles = ['CLIENT', 'DEVELOPER', 'USER', 'EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'];
    if (query?.role && allowedRoles.includes(query.role.toUpperCase())) {
      filter.role = query.role.toUpperCase();
    }

    // 3. IsActive filter
    if (query?.isActive !== undefined) {
      const isActiveBool = query.isActive === true || query.isActive === 'true';
      filter.isActive = isActiveBool;
    }

    // 4. Sorting (whitelisted sort fields)
    const sortableFields: Record<string, string> = {
      createdat: 'createdAt',
      updatedat: 'updatedAt',
      email: 'email',
      name: 'name',
      role: 'role',
      isactive: 'isActive'
    };

    let sortOptions: any = { createdAt: -1 };
    if (query?.sort) {
      const parts = query.sort.split(',')[0].trim();
      let isDesc = parts.startsWith('-') || parts.toLowerCase().endsWith(':desc');
      let fieldName = parts.replace(/^[-+]/, '').split(':')[0].toLowerCase().trim();

      if (sortableFields[fieldName]) {
        sortOptions = { [sortableFields[fieldName]]: isDesc ? -1 : 1 };
      }
    }

    // 5. Projection selection (whitelisted safe fields, strictly excluding sensitive secrets)
    const sensitiveFields = new Set(['passwordHash', 'failedAttempts', 'lockoutUntil']);
    const allowedProjection: Record<string, number> = {
      _id: 1,
      email: 1,
      name: 1,
      role: 1,
      isActive: 1,
      provider: 1,
      providerId: 1,
      createdAt: 1,
      updatedAt: 1
    };

    let projection: Record<string, number> = { ...allowedProjection };
    if (query?.fields && Array.isArray(query.fields) && query.fields.length > 0) {
      const customProjection: Record<string, number> = { _id: 1 };
      for (const field of query.fields) {
        const trimmed = field.trim();
        if (allowedProjection[trimmed] && !sensitiveFields.has(trimmed)) {
          customProjection[trimmed] = 1;
        }
      }
      if (Object.keys(customProjection).length > 1) {
        projection = customProjection;
      }
    }

    const [docs, total] = await Promise.all([
      UserAuthModel.find(filter, projection).sort(sortOptions).skip(skip).limit(limit).exec(),
      UserAuthModel.countDocuments(filter).exec()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users: docs.map((doc) => this.toDomain(doc)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
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
          isEmailVerified: userAuth.isEmailVerified,
          emailVerifiedAt: userAuth.emailVerifiedAt,
          isPolicyAccepted: userAuth.isPolicyAccepted,
          policyAcceptedAt: userAuth.policyAcceptedAt,
          passwordChangedAt: userAuth.passwordChangedAt,
          failedAttempts: userAuth.failedAttempts,
          lockoutUntil: userAuth.lockoutUntil,
          deletedAt: userAuth.deletedAt
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
      isEmailVerified: userAuth.isEmailVerified,
      emailVerifiedAt: userAuth.emailVerifiedAt,
      isPolicyAccepted: userAuth.isPolicyAccepted,
      policyAcceptedAt: userAuth.policyAcceptedAt,
      passwordChangedAt: userAuth.passwordChangedAt,
      failedAttempts: userAuth.failedAttempts,
      lockoutUntil: userAuth.lockoutUntil,
      deletedAt: userAuth.deletedAt
    });
    return this.toDomain(doc);
  }

  async update(userAuth: UserAuth): Promise<UserAuth> {
    return this.save(userAuth);
  }
}

import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../domain/entities/UserAuth.entity';

export interface AdminUpdateUserInputDTO {
  callerUserId?: string;
  callerRole?: string;
  userId: string;
  name?: string;
  role?: string;
  isActive?: boolean;
}

import { UserNotFoundError, ForbiddenError, ValidationError } from '../errors/errors';

export class AdminUpdateUserUseCase {
  constructor(private userAuthRepo: IUserAuthRepository) {}

  public async execute(input: AdminUpdateUserInputDTO): Promise<UserAuth> {
    const user = await this.userAuthRepo.findById(input.userId);
    if (!user || user.isDeleted) {
      throw new UserNotFoundError('User not found');
    }

    const callerRole = (input.callerRole || '').toUpperCase();
    const targetRole = (user.role || '').toUpperCase();
    const isTargetAdmin = targetRole === 'ADMIN' || targetRole === 'SUPER_ADMIN';

    // Rule 1: EMPLOYEE must NOT be allowed to modify an ADMIN
    if (callerRole === 'EMPLOYEE' && isTargetAdmin) {
      throw new ForbiddenError('Employees are not authorized to modify Admin accounts');
    }

    // Rule 2: Prevent a user from changing their own role
    if (input.role && input.role.toUpperCase() !== targetRole && input.callerUserId === input.userId) {
      throw new ForbiddenError('Users cannot modify their own role');
    }

    // Rule 3: Only ADMIN (or SUPER_ADMIN) may perform role assignments
    if (input.role && input.role.toUpperCase() !== targetRole) {
      if (callerRole !== 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
        throw new ForbiddenError('Only Admins can assign or change user roles');
      }

      const allowedRoles = ['CLIENT', 'DEVELOPER', 'USER', 'EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(input.role.toUpperCase())) {
        throw new ValidationError('Invalid role specified');
      }
    }

    const updatedUser = UserAuth.create({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: input.name !== undefined ? input.name : user.name,
      role: input.role !== undefined ? input.role.toUpperCase() : user.role,
      isActive: input.isActive !== undefined ? input.isActive : user.isActive,
      provider: user.provider as any,
      providerId: user.providerId,
      passwordChangedAt: user.passwordChangedAt,
      failedAttempts: user.failedAttempts,
      lockoutUntil: user.lockoutUntil,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: new Date()
    });

    return await this.userAuthRepo.save(updatedUser);
  }
}

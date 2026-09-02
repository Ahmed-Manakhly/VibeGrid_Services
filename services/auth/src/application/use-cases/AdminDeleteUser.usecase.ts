import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { UserNotFoundError, ForbiddenError } from '../errors/errors';

export interface AdminDeleteUserInputDTO {
  callerUserId: string;
  callerRole: string;
  targetUserId: string;
}

export class AdminDeleteUserUseCase {
  constructor(private userAuthRepo: IUserAuthRepository) {}

  public async execute(input: AdminDeleteUserInputDTO): Promise<void> {
    const targetUser = await this.userAuthRepo.findById(input.targetUserId);
    if (!targetUser || targetUser.isDeleted) {
      throw new UserNotFoundError('User not found');
    }

    const callerRole = (input.callerRole || '').toUpperCase();
    const targetRole = (targetUser.role || '').toUpperCase();

    // Rule 1: EMPLOYEE cannot delete accounts
    if (callerRole === 'EMPLOYEE') {
      throw new ForbiddenError('Employees are not authorized to delete user accounts');
    }

    // Rule 2: Cannot delete an ADMIN unless authorized (only SUPER_ADMIN or ADMIN deleting non-SUPER_ADMIN)
    if (targetRole === 'ADMIN' || targetRole === 'SUPER_ADMIN') {
      if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'ADMIN') {
        throw new ForbiddenError('Not authorized to delete Admin accounts');
      }
      if (targetRole === 'SUPER_ADMIN' && callerRole !== 'SUPER_ADMIN') {
        throw new ForbiddenError('Only Super Admins can delete Super Admin accounts');
      }
    }

    // Rule 3: Prevent self-deletion via admin endpoint if desired or allow
    targetUser.softDelete();
    await this.userAuthRepo.save(targetUser);
  }
}

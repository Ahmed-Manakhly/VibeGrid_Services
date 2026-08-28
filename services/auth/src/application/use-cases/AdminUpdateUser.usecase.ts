import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../domain/entities/UserAuth.entity';

export interface AdminUpdateUserInputDTO {
  userId: string;
  name?: string;
  role?: string;
  isActive?: boolean;
}

import { UserNotFoundError } from '../errors/errors';

export class AdminUpdateUserUseCase {
  constructor(private userAuthRepo: IUserAuthRepository) {}

  public async execute(input: AdminUpdateUserInputDTO): Promise<UserAuth> {
    const user = await this.userAuthRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError('User not found');
    }

    const updatedUser = UserAuth.create({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: input.name !== undefined ? input.name : user.name,
      role: input.role !== undefined ? input.role : user.role,
      isActive: input.isActive !== undefined ? input.isActive : user.isActive,
      provider: user.provider as any,
      providerId: user.providerId,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: new Date()
    });

    return await this.userAuthRepo.save(updatedUser);
  }
}

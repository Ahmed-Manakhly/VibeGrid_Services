import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../domain/entities/UserAuth.entity';

export interface UpdateMeInputDTO {
  userId: string;
  name?: string;
}

import { UserNotFoundError } from '../errors/errors';

export class UpdateMeUseCase {
  constructor(private userAuthRepo: IUserAuthRepository) {}

  public async execute(input: UpdateMeInputDTO): Promise<UserAuth> {
    const user = await this.userAuthRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError('User profile not found');
    }

    const updatedUser = UserAuth.create({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: input.name !== undefined ? input.name : user.name,
      role: user.role,
      isActive: user.isActive,
      provider: user.provider as any,
      providerId: user.providerId,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
      updatedAt: new Date()
    });

    return await this.userAuthRepo.save(updatedUser);
  }
}

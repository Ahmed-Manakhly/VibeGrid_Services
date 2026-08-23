import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../domain/entities/UserAuth.entity';

export class GetMeUseCase {
  constructor(private userAuthRepo: IUserAuthRepository) {}

  public async execute(userId: string): Promise<UserAuth> {
    const user = await this.userAuthRepo.findById(userId);
    if (!user) {
      throw new Error('User profile not found');
    }
    return user;
  }
}

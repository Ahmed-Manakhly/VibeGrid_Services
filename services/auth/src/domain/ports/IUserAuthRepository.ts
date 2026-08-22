import { UserAuth } from '../entities/UserAuth.entity';

export interface IUserAuthRepository {
  findByEmail(email: string): Promise<UserAuth | null>;
  findById(id: string): Promise<UserAuth | null>;
  findByProvider(provider: string, providerId: string): Promise<UserAuth | null>;
  save(userAuth: UserAuth): Promise<UserAuth>;
}

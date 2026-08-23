import { UserAuth } from '../entities/UserAuth.entity';

export interface FindAllUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedUsersResult {
  users: UserAuth[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IUserAuthRepository {
  findByEmail(email: string): Promise<UserAuth | null>;
  findById(id: string): Promise<UserAuth | null>;
  findByProvider(provider: string, providerId: string): Promise<UserAuth | null>;
  findAll(query?: FindAllUsersQuery): Promise<PaginatedUsersResult>;
  save(userAuth: UserAuth): Promise<UserAuth>;
  update(userAuth: UserAuth): Promise<UserAuth>;
}

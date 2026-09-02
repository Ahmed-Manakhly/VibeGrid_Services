import { UserAuth } from '../entities/UserAuth.entity';

export interface FindAllUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean | string;
  sort?: string;
  fields?: string[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedUsersResult {
  users: UserAuth[];
  pagination: PaginationMeta;
}

export interface IUserAuthRepository {
  findByEmail(email: string): Promise<UserAuth | null>;
  findById(id: string): Promise<UserAuth | null>;
  findByProvider(provider: string, providerId: string): Promise<UserAuth | null>;
  findFirstByRole(role: string): Promise<UserAuth | null>;
  findAll(query?: FindAllUsersQuery): Promise<PaginatedUsersResult>;
  save(userAuth: UserAuth): Promise<UserAuth>;
  update(userAuth: UserAuth): Promise<UserAuth>;
}

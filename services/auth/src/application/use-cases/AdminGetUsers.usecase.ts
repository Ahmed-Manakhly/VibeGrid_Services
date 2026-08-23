import { IUserAuthRepository, FindAllUsersQuery, PaginatedUsersResult } from '../../domain/ports/IUserAuthRepository';

export class AdminGetUsersUseCase {
  constructor(private userAuthRepo: IUserAuthRepository) {}

  public async execute(query?: FindAllUsersQuery): Promise<PaginatedUsersResult> {
    return await this.userAuthRepo.findAll(query);
  }
}

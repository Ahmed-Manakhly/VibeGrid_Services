import { AdminGetUsersUseCase } from '../AdminGetUsers.usecase';
import { IUserAuthRepository, PaginatedUsersResult } from '../../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';

describe('AdminGetUsersUseCase', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let adminGetUsersUseCase: AdminGetUsersUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findFirstByRole: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    };
    adminGetUsersUseCase = new AdminGetUsersUseCase(mockUserAuthRepo);
  });

  it('should query repository with provided filters and return paginated users', async () => {
    const mockResult: PaginatedUsersResult = {
      users: [
        UserAuth.create({ email: 'user1@test.com', name: 'User 1' }),
        UserAuth.create({ email: 'user2@test.com', name: 'User 2' })
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    };

    mockUserAuthRepo.findAll.mockResolvedValue(mockResult);

    const query = { page: 1, limit: 10, role: 'USER' as any, search: 'user' };
    const result = await adminGetUsersUseCase.execute(query);

    expect(mockUserAuthRepo.findAll).toHaveBeenCalledWith(query);
    expect(result.users).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
  });

  it('should pass empty query through when called with no arguments', async () => {
    const mockResult: PaginatedUsersResult = {
      users: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
    mockUserAuthRepo.findAll.mockResolvedValue(mockResult);

    const result = await adminGetUsersUseCase.execute();

    expect(mockUserAuthRepo.findAll).toHaveBeenCalledWith(undefined);
    expect(result.users).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

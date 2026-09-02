import { AdminDeleteUserUseCase } from '../AdminDeleteUser.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { ForbiddenError, UserNotFoundError } from '../../errors/errors';

describe('AdminDeleteUserUseCase — Soft Delete', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let adminDeleteUserUseCase: AdminDeleteUserUseCase;

  let clientUser: UserAuth;
  let adminUser: UserAuth;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation(async (user: UserAuth) => user),
      update: jest.fn()
    };

    adminDeleteUserUseCase = new AdminDeleteUserUseCase(mockUserAuthRepo);

    clientUser = UserAuth.create({
      id: 'client_1',
      email: 'client@example.com',
      role: 'CLIENT',
      isActive: true
    });

    adminUser = UserAuth.create({
      id: 'admin_1',
      email: 'admin@example.com',
      role: 'ADMIN',
      isActive: true
    });
  });

  it('should soft-delete user and persist deletedAt and isActive=false when executed by ADMIN', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(clientUser);

    await adminDeleteUserUseCase.execute({
      callerUserId: 'admin_1',
      callerRole: 'ADMIN',
      targetUserId: 'client_1'
    });

    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUser = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUser.isDeleted).toBe(true);
    expect(savedUser.deletedAt).toBeDefined();
    expect(savedUser.isActive).toBe(false);
  });

  it('should reject deletion attempt when executed by EMPLOYEE caller', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(clientUser);

    await expect(
      adminDeleteUserUseCase.execute({
        callerUserId: 'emp_1',
        callerRole: 'EMPLOYEE',
        targetUserId: 'client_1'
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('should reject deletion of ADMIN account when executed by another non-SUPER_ADMIN', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(adminUser);

    await expect(
      adminDeleteUserUseCase.execute({
        callerUserId: 'emp_1',
        callerRole: 'EMPLOYEE',
        targetUserId: 'admin_1'
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('should throw UserNotFoundError if target user is already soft-deleted', async () => {
    const deletedUser = UserAuth.create({
      id: 'deleted_1',
      email: 'deleted@example.com',
      role: 'CLIENT',
      deletedAt: new Date()
    });

    mockUserAuthRepo.findById.mockResolvedValue(deletedUser);

    await expect(
      adminDeleteUserUseCase.execute({
        callerUserId: 'admin_1',
        callerRole: 'ADMIN',
        targetUserId: 'deleted_1'
      })
    ).rejects.toThrow(UserNotFoundError);
  });
});

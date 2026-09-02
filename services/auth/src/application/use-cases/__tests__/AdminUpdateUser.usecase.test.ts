import { AdminUpdateUserUseCase } from '../AdminUpdateUser.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { ForbiddenError, UserNotFoundError, ValidationError } from '../../errors/errors';

describe('AdminUpdateUserUseCase — Privilege Escalation Guards', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let adminUpdateUserUseCase: AdminUpdateUserUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation(async (user: UserAuth) => user),
      update: jest.fn()
    };

    adminUpdateUserUseCase = new AdminUpdateUserUseCase(mockUserAuthRepo);
  });

  const adminUser = UserAuth.create({
    id: 'admin_1',
    email: 'admin@example.com',
    role: 'ADMIN',
    isActive: true
  });

  const employeeUser = UserAuth.create({
    id: 'emp_1',
    email: 'emp@example.com',
    role: 'EMPLOYEE',
    isActive: true
  });

  const clientUser = UserAuth.create({
    id: 'client_1',
    email: 'client@example.com',
    role: 'CLIENT',
    isActive: true
  });

  it('should reject modification of ADMIN account by an EMPLOYEE caller', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(adminUser);

    await expect(
      adminUpdateUserUseCase.execute({
        callerUserId: 'emp_1',
        callerRole: 'EMPLOYEE',
        userId: 'admin_1',
        name: 'Hacked Name'
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('should reject role assignment attempt by an EMPLOYEE caller', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(clientUser);

    await expect(
      adminUpdateUserUseCase.execute({
        callerUserId: 'emp_1',
        callerRole: 'EMPLOYEE',
        userId: 'client_1',
        role: 'ADMIN'
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('should reject self-role-change by an ADMIN caller', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(adminUser);

    await expect(
      adminUpdateUserUseCase.execute({
        callerUserId: 'admin_1',
        callerRole: 'ADMIN',
        userId: 'admin_1',
        role: 'SUPER_ADMIN'
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('should reject invalid role specification', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(clientUser);

    await expect(
      adminUpdateUserUseCase.execute({
        callerUserId: 'admin_1',
        callerRole: 'ADMIN',
        userId: 'client_1',
        role: 'SUPER_HACKER_ROLE'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should successfully update user details when executed by a valid ADMIN', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(clientUser);

    const result = await adminUpdateUserUseCase.execute({
      callerUserId: 'admin_1',
      callerRole: 'ADMIN',
      userId: 'client_1',
      name: 'New Valid Name',
      role: 'DEVELOPER'
    });

    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    expect(result.name).toBe('New Valid Name');
    expect(result.role).toBe('DEVELOPER');
  });

  it('should throw UserNotFoundError if target user is soft-deleted or missing', async () => {
    const deletedUser = UserAuth.create({
      id: 'deleted_1',
      email: 'deleted@example.com',
      role: 'CLIENT',
      deletedAt: new Date()
    });

    mockUserAuthRepo.findById.mockResolvedValue(deletedUser);

    await expect(
      adminUpdateUserUseCase.execute({
        callerUserId: 'admin_1',
        callerRole: 'ADMIN',
        userId: 'deleted_1',
        name: 'New Name'
      })
    ).rejects.toThrow(UserNotFoundError);
  });
});

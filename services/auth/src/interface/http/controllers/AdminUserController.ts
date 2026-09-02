import { Request, Response } from 'express';
import { AdminCreateUserUseCase } from '../../../application/use-cases/AdminCreateUser.usecase';
import { AdminGetUsersUseCase } from '../../../application/use-cases/AdminGetUsers.usecase';
import { AdminGetUserByIdUseCase } from '../../../application/use-cases/AdminGetUserById.usecase';
import { AdminUpdateUserUseCase } from '../../../application/use-cases/AdminUpdateUser.usecase';
import { AdminDeleteUserUseCase } from '../../../application/use-cases/AdminDeleteUser.usecase';
import { ValidationError } from '../../../application/errors/errors';
import { ApiResponse } from '../response/apiResponse';

export class AdminUserController {
  constructor(
    private adminCreateUserUseCase: AdminCreateUserUseCase,
    private adminGetUsersUseCase: AdminGetUsersUseCase,
    private adminGetUserByIdUseCase: AdminGetUserByIdUseCase,
    private adminUpdateUserUseCase: AdminUpdateUserUseCase,
    private adminDeleteUserUseCase: AdminDeleteUserUseCase
  ) {}

  createUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, role, isActive } = req.body;
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await this.adminCreateUserUseCase.execute({ email, password, name, role, isActive });
    ApiResponse.success(
      res,
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        }
      },
      201
    );
  };

  getUsers = async (req: Request, res: Response): Promise<void> => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const isActive = req.query.isActive as string;
    const sort = req.query.sort as string;
    const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined;

    const result = await this.adminGetUsersUseCase.execute({
      page,
      limit,
      search,
      role,
      isActive,
      sort,
      fields
    });

    ApiResponse.success(
      res,
      {
        users: result.users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt
        }))
      },
      200,
      result.pagination
    );
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await this.adminGetUserByIdUseCase.execute(id);
    ApiResponse.success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, role, isActive } = req.body;
    const callerUserId = (req as any).user?.id || (req as any).user?.sub;
    const callerRole = (req as any).user?.role;

    const user = await this.adminUpdateUserUseCase.execute({
      callerUserId,
      callerRole,
      userId: id,
      name,
      role,
      isActive
    });

    ApiResponse.success(res, {
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }
    });
  };

  toggleStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { isActive } = req.body;
    const callerUserId = (req as any).user?.id || (req as any).user?.sub;
    const callerRole = (req as any).user?.role;

    if (typeof isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean');
    }

    const user = await this.adminUpdateUserUseCase.execute({
      callerUserId,
      callerRole,
      userId: id,
      isActive
    });

    ApiResponse.success(res, {
      message: `User status changed to ${isActive ? 'active' : 'locked'}`,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive
      }
    });
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const callerUserId = (req as any).user?.id || (req as any).user?.sub;
    const callerRole = (req as any).user?.role;

    await this.adminDeleteUserUseCase.execute({
      callerUserId,
      callerRole,
      targetUserId: id
    });

    ApiResponse.success(res, { message: 'User deleted successfully' });
  };
}

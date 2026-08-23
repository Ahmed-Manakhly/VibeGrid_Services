import { Request, Response } from 'express';
import { AdminCreateUserUseCase } from '../../../application/use-cases/AdminCreateUser.usecase';
import { AdminGetUsersUseCase } from '../../../application/use-cases/AdminGetUsers.usecase';
import { AdminGetUserByIdUseCase } from '../../../application/use-cases/AdminGetUserById.usecase';
import { AdminUpdateUserUseCase } from '../../../application/use-cases/AdminUpdateUser.usecase';

export class AdminUserController {
  constructor(
    private adminCreateUserUseCase: AdminCreateUserUseCase,
    private adminGetUsersUseCase: AdminGetUsersUseCase,
    private adminGetUserByIdUseCase: AdminGetUserByIdUseCase,
    private adminUpdateUserUseCase: AdminUpdateUserUseCase
  ) {}

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, role, isActive } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await this.adminCreateUserUseCase.execute({ email, password, name, role, isActive });
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        }
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;

      const result = await this.adminGetUsersUseCase.execute({ page, limit, search });
      res.status(200).json({
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        users: result.users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.adminGetUserByIdUseCase.execute(id);
      res.status(200).json({
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
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, role, isActive } = req.body;

      const user = await this.adminUpdateUserUseCase.execute({ userId: id, name, role, isActive });
      res.status(200).json({
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        }
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  toggleStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive must be a boolean' });
        return;
      }

      const user = await this.adminUpdateUserUseCase.execute({ userId: id, isActive });
      res.status(200).json({
        message: `User status changed to ${isActive ? 'active' : 'locked'}`,
        user: {
          id: user.id,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}

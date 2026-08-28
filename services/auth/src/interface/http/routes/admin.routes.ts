import { Router } from 'express';
import { AdminUserController } from '../controllers/AdminUserController';
import { createRestrictToMiddleware } from '../middleware/restrictTo.middleware';
import { asyncHandler } from '../middleware/asyncHandler';

export function createAdminRouter(adminController: AdminUserController, protectMiddleware: any): Router {
  const router = Router();

  const adminOnly = createRestrictToMiddleware('ADMIN', 'SUPER_ADMIN');

  router.use(protectMiddleware);
  router.use(adminOnly);

  router.post('/users', asyncHandler(adminController.createUser));
  router.get('/users', asyncHandler(adminController.getUsers));
  router.get('/users/:id', asyncHandler(adminController.getUserById));
  router.put('/users/:id', asyncHandler(adminController.updateUser));
  router.patch('/users/:id/status', asyncHandler(adminController.toggleStatus));

  return router;
}

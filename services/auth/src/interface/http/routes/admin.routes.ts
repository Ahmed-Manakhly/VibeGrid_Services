import { Router } from 'express';
import { AdminUserController } from '../controllers/AdminUserController';
import { createRestrictToMiddleware } from '../middleware/restrictTo.middleware';

export function createAdminRouter(adminController: AdminUserController, protectMiddleware: any): Router {
  const router = Router();

  const adminOnly = createRestrictToMiddleware('ADMIN', 'SUPER_ADMIN');

  router.use(protectMiddleware);
  router.use(adminOnly);

  router.post('/users', adminController.createUser);
  router.get('/users', adminController.getUsers);
  router.get('/users/:id', adminController.getUserById);
  router.put('/users/:id', adminController.updateUser);
  router.patch('/users/:id/status', adminController.toggleStatus);

  return router;
}

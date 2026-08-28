import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { OAuthController } from '../controllers/OAuthController';
import { asyncHandler } from '../middleware/asyncHandler';

export function createAuthRouter(
  authController: AuthController,
  oauthController: OAuthController,
  protectMiddleware?: any
): Router {
  const router = Router();

  router.post('/register', asyncHandler(authController.register));
  router.post('/login', asyncHandler(authController.login));
  router.post('/refresh', asyncHandler(authController.refresh));
  router.post('/logout', asyncHandler(authController.logout));
  router.post('/forgot-password', asyncHandler(authController.forgotPassword));
  router.post('/reset-password', asyncHandler(authController.resetPassword));
  if (protectMiddleware) {
    router.post('/change-password', protectMiddleware, asyncHandler(authController.changePassword));
    router.get('/me', protectMiddleware, asyncHandler(authController.getMe));
    router.patch('/me', protectMiddleware, asyncHandler(authController.updateMe));
  } else {
    router.post('/change-password', asyncHandler(authController.changePassword));
    router.get('/me', asyncHandler(authController.getMe));
    router.patch('/me', asyncHandler(authController.updateMe));
  }
  router.get('/validate-token', asyncHandler(authController.validateToken));
  router.get('/jwks.json', asyncHandler(authController.getJwks));

  router.get('/oauth/google', asyncHandler(oauthController.googleLogin));
  router.get('/oauth/google/callback', asyncHandler(oauthController.googleCallback));
  router.get('/oauth/github', asyncHandler(oauthController.githubLogin));
  router.get('/oauth/github/callback', asyncHandler(oauthController.githubCallback));

  return router;
}

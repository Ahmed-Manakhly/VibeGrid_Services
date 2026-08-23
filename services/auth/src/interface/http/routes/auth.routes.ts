import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { OAuthController } from '../controllers/OAuthController';

export function createAuthRouter(
  authController: AuthController,
  oauthController: OAuthController,
  protectMiddleware?: any
): Router {
  const router = Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/refresh', authController.refresh);
  router.post('/logout', authController.logout);
  router.post('/forgot-password', authController.forgotPassword);
  router.post('/reset-password', authController.resetPassword);
  if (protectMiddleware) {
    router.post('/change-password', protectMiddleware, authController.changePassword);
  } else {
    router.post('/change-password', authController.changePassword);
  }
  router.get('/jwks.json', authController.getJwks);

  router.get('/oauth/google', oauthController.googleLogin);
  router.get('/oauth/google/callback', oauthController.googleCallback);
  router.get('/oauth/github', oauthController.githubLogin);
  router.get('/oauth/github/callback', oauthController.githubCallback);

  return router;
}

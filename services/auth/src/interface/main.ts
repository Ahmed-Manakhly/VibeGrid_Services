import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { MongoUserAuthRepo } from '../infrastructure/persistence/MongoUserAuthRepo';
import { MongoRefreshTokenRepo } from '../infrastructure/persistence/MongoRefreshTokenRepo';
import { MongoRevokedTokenRepo } from '../infrastructure/persistence/MongoRevokedTokenRepo';
import { MongoEmailTokenRepo } from '../infrastructure/persistence/MongoEmailTokenRepo';
import { NodemailerEmailSender } from '../infrastructure/email/NodemailerEmailSender';
import { Argon2Hasher } from '../infrastructure/security/Argon2Hasher';
import { RS256TokenSigner } from '../infrastructure/security/RS256TokenSigner';
import { RabbitMQPublisher } from '../infrastructure/messaging/RabbitMQPublisher';

import { RegisterUserUseCase } from '../application/use-cases/RegisterUser.usecase';
import { AuthenticateUseCase } from '../application/use-cases/Authenticate.usecase';
import { RefreshTokenUseCase } from '../application/use-cases/RefreshToken.usecase';
import { RevokeTokenUseCase } from '../application/use-cases/RevokeToken.usecase';
import { RequestPasswordResetUseCase } from '../application/use-cases/RequestPasswordReset.usecase';
import { ResetPasswordUseCase } from '../application/use-cases/ResetPassword.usecase';
import { ChangePasswordUseCase } from '../application/use-cases/ChangePassword.usecase';
import { ValidateTokenGuardUseCase } from '../application/use-cases/ValidateTokenGuard.usecase';
import { OAuthLoginUseCase } from '../application/use-cases/OAuthLogin.usecase';
import { AdminCreateUserUseCase } from '../application/use-cases/AdminCreateUser.usecase';
import { AdminGetUsersUseCase } from '../application/use-cases/AdminGetUsers.usecase';
import { AdminGetUserByIdUseCase } from '../application/use-cases/AdminGetUserById.usecase';
import { AdminUpdateUserUseCase } from '../application/use-cases/AdminUpdateUser.usecase';

import { AuthController } from './http/controllers/AuthController';
import { OAuthController } from './http/controllers/OAuthController';
import { AdminUserController } from './http/controllers/AdminUserController';
import { createAuthRouter } from './http/routes/auth.routes';
import { createAdminRouter } from './http/routes/admin.routes';
import { createProtectMiddleware } from './http/middleware/protect.middleware';

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://vibegrid_mongo:27017/auth_db';
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://vibegrid_rabbitmq:5672';

async function bootstrap() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'auth-microservice' });
  });

  // Connect MongoDB
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Auth Service connected to MongoDB at:', MONGO_URI);
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
  }

  // Connect RabbitMQ
  const eventPublisher = new RabbitMQPublisher(RABBIT_URL);
  await eventPublisher.connect();

  // Instantiate Repositories & Security Adapters
  const userAuthRepo = new MongoUserAuthRepo();
  const refreshTokenRepo = new MongoRefreshTokenRepo();
  const revokedTokenRepo = new MongoRevokedTokenRepo();
  const emailTokenRepo = new MongoEmailTokenRepo();
  const emailSender = new NodemailerEmailSender();
  const hasher = new Argon2Hasher();
  const tokenSigner = new RS256TokenSigner();

  // Instantiate Use Cases
  const registerUserUseCase = new RegisterUserUseCase(
    userAuthRepo,
    refreshTokenRepo,
    hasher,
    eventPublisher,
    tokenSigner
  );

  const authenticateUseCase = new AuthenticateUseCase(
    userAuthRepo,
    refreshTokenRepo,
    hasher,
    tokenSigner
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    refreshTokenRepo,
    userAuthRepo,
    tokenSigner
  );

  const revokeTokenUseCase = new RevokeTokenUseCase(revokedTokenRepo);

  const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
    userAuthRepo,
    emailTokenRepo,
    hasher,
    emailSender
  );

  const resetPasswordUseCase = new ResetPasswordUseCase(
    userAuthRepo,
    emailTokenRepo,
    hasher,
    revokedTokenRepo
  );

  const changePasswordUseCase = new ChangePasswordUseCase(
    userAuthRepo,
    hasher,
    revokedTokenRepo
  );

  const validateTokenGuardUseCase = new ValidateTokenGuardUseCase(
    userAuthRepo,
    revokedTokenRepo
  );

  const protectMiddleware = createProtectMiddleware(validateTokenGuardUseCase, tokenSigner);

  const oauthLoginUseCase = new OAuthLoginUseCase(
    userAuthRepo,
    refreshTokenRepo,
    eventPublisher,
    tokenSigner
  );

  // Admin Use Cases
  const adminCreateUserUseCase = new AdminCreateUserUseCase(userAuthRepo, hasher);
  const adminGetUsersUseCase = new AdminGetUsersUseCase(userAuthRepo);
  const adminGetUserByIdUseCase = new AdminGetUserByIdUseCase(userAuthRepo);
  const adminUpdateUserUseCase = new AdminUpdateUserUseCase(userAuthRepo);

  // Instantiate Controllers & Routers
  const authController = new AuthController(
    registerUserUseCase,
    authenticateUseCase,
    refreshTokenUseCase,
    revokeTokenUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    changePasswordUseCase,
    tokenSigner
  );
  const oauthController = new OAuthController(oauthLoginUseCase);
  const adminUserController = new AdminUserController(
    adminCreateUserUseCase,
    adminGetUsersUseCase,
    adminGetUserByIdUseCase,
    adminUpdateUserUseCase
  );

  const authRouter = createAuthRouter(authController, oauthController, protectMiddleware);
  const adminRouter = createAdminRouter(adminUserController, protectMiddleware);

  app.use('/api/auth', authRouter);
  app.use('/api/auth/admin', adminRouter);

  app.listen(PORT, () => {
    console.log(`🚀 Auth Microservice running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during Auth Microservice bootstrap:', err);
  process.exit(1);
});

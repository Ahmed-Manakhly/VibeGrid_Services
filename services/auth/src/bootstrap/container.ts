import { AppConfig } from '../config/env';
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
import { GetMeUseCase } from '../application/use-cases/GetMe.usecase';
import { UpdateMeUseCase } from '../application/use-cases/UpdateMe.usecase';
import { ValidateTokenGuardUseCase } from '../application/use-cases/ValidateTokenGuard.usecase';
import { OAuthLoginUseCase } from '../application/use-cases/OAuthLogin.usecase';
import { VerifyEmailUseCase } from '../application/use-cases/VerifyEmail.usecase';
import { SendEmailVerificationTokenUseCase } from '../application/use-cases/SendEmailVerificationToken.usecase';

import { AdminCreateUserUseCase } from '../application/use-cases/AdminCreateUser.usecase';
import { AdminGetUsersUseCase } from '../application/use-cases/AdminGetUsers.usecase';
import { AdminGetUserByIdUseCase } from '../application/use-cases/AdminGetUserById.usecase';
import { AdminUpdateUserUseCase } from '../application/use-cases/AdminUpdateUser.usecase';
import { AdminDeleteUserUseCase } from '../application/use-cases/AdminDeleteUser.usecase';

import { AuthController } from '../interface/http/controllers/AuthController';
import { OAuthController } from '../interface/http/controllers/OAuthController';
import { AdminUserController } from '../interface/http/controllers/AdminUserController';
import { createProtectMiddleware } from '../interface/http/middleware/protect.middleware';

export interface ServiceContainer {
  eventPublisher: RabbitMQPublisher;
  userAuthRepo: MongoUserAuthRepo;
  tokenSigner: RS256TokenSigner;
  authController: AuthController;
  oauthController: OAuthController;
  adminUserController: AdminUserController;
  protectMiddleware: ReturnType<typeof createProtectMiddleware>;
  adminCreateUserUseCase: AdminCreateUserUseCase;
}

export function createContainer(config: AppConfig, eventPublisher: RabbitMQPublisher): ServiceContainer {
  const isProd = config.nodeEnv === 'production';

  // Repositories & Adapters
  const userAuthRepo = new MongoUserAuthRepo();
  const refreshTokenRepo = new MongoRefreshTokenRepo();
  const revokedTokenRepo = new MongoRevokedTokenRepo();
  const emailTokenRepo = new MongoEmailTokenRepo();
  const emailSender = new NodemailerEmailSender();
  const hasher = new Argon2Hasher();
  const tokenSigner = new RS256TokenSigner(
    config.jwtPrivateKeyPath,
    config.jwtPublicKeyPath,
    config.tokenExpiry.accessTokenExpiresInSec
  );

  // Use Cases
  const verifyEmailUseCase = new VerifyEmailUseCase(userAuthRepo, emailTokenRepo, config.fixedSeedOtp);
  const sendEmailVerificationTokenUseCase = new SendEmailVerificationTokenUseCase(
    userAuthRepo,
    emailTokenRepo,
    emailSender,
    config.tokenExpiry.emailVerificationTokenExpiresInSec
  );

  const registerUserUseCase = new RegisterUserUseCase(
    userAuthRepo,
    hasher,
    eventPublisher,
    sendEmailVerificationTokenUseCase
  );

  const authenticateUseCase = new AuthenticateUseCase(
    userAuthRepo,
    refreshTokenRepo,
    hasher,
    tokenSigner,
    config.tokenExpiry.refreshTokenMaxAgeMs
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    refreshTokenRepo,
    userAuthRepo,
    tokenSigner,
    config.tokenExpiry.refreshTokenMaxAgeMs
  );

  const revokeTokenUseCase = new RevokeTokenUseCase(revokedTokenRepo, refreshTokenRepo);

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
    revokedTokenRepo,
    refreshTokenRepo,
    config.tokenExpiry.accessTokenMaxAgeMs,
    config.tokenExpiry.refreshTokenMaxAgeMs
  );

  const validateTokenGuardUseCase = new ValidateTokenGuardUseCase(
    userAuthRepo,
    revokedTokenRepo
  );

  const oauthLoginUseCase = new OAuthLoginUseCase(
    userAuthRepo,
    refreshTokenRepo,
    eventPublisher,
    tokenSigner,
    config.tokenExpiry.refreshTokenMaxAgeMs
  );

  const getMeUseCase = new GetMeUseCase(userAuthRepo);
  const updateMeUseCase = new UpdateMeUseCase(userAuthRepo);

  // Admin Use Cases
  const adminCreateUserUseCase = new AdminCreateUserUseCase(userAuthRepo, hasher);
  const adminGetUsersUseCase = new AdminGetUsersUseCase(userAuthRepo);
  const adminGetUserByIdUseCase = new AdminGetUserByIdUseCase(userAuthRepo);
  const adminUpdateUserUseCase = new AdminUpdateUserUseCase(userAuthRepo);
  const adminDeleteUserUseCase = new AdminDeleteUserUseCase(userAuthRepo);

  // Controllers & Middlewares
  const authController = new AuthController(
    registerUserUseCase,
    authenticateUseCase,
    refreshTokenUseCase,
    revokeTokenUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    changePasswordUseCase,
    getMeUseCase,
    updateMeUseCase,
    validateTokenGuardUseCase,
    tokenSigner,
    config.tokenExpiry,
    verifyEmailUseCase,
    sendEmailVerificationTokenUseCase,
    config.cookieDomain,
    isProd
  );

  const oauthController = new OAuthController(
    oauthLoginUseCase,
    config.tokenExpiry,
    config.oauth,
    isProd
  );

  const adminUserController = new AdminUserController(
    adminCreateUserUseCase,
    adminGetUsersUseCase,
    adminGetUserByIdUseCase,
    adminUpdateUserUseCase,
    adminDeleteUserUseCase
  );

  const protectMiddleware = createProtectMiddleware(validateTokenGuardUseCase, tokenSigner);

  return {
    eventPublisher,
    userAuthRepo,
    tokenSigner,
    authController,
    oauthController,
    adminUserController,
    protectMiddleware,
    adminCreateUserUseCase
  };
}

import { Request, Response } from 'express';
import { createLogger } from '@vibegrid/logger';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUser.usecase';
import { AuthenticateUseCase } from '../../../application/use-cases/Authenticate.usecase';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshToken.usecase';

const logger = createLogger('vibegrid-auth');
import { RevokeTokenUseCase } from '../../../application/use-cases/RevokeToken.usecase';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/RequestPasswordReset.usecase';
import { ResetPasswordUseCase } from '../../../application/use-cases/ResetPassword.usecase';
import { ChangePasswordUseCase } from '../../../application/use-cases/ChangePassword.usecase';
import { GetMeUseCase } from '../../../application/use-cases/GetMe.usecase';
import { UpdateMeUseCase } from '../../../application/use-cases/UpdateMe.usecase';
import { ValidateTokenGuardUseCase } from '../../../application/use-cases/ValidateTokenGuard.usecase';
import { ITokenSigner } from '../../../domain/ports/ITokenSigner';
import { TokenExpiryConfig } from '../../../config/env';
import { ValidationError, UnauthorizedError } from '../../../application/errors/errors';
import { sendSuccess } from '../response/apiResponse';

import { VerifyEmailUseCase } from '../../../application/use-cases/VerifyEmail.usecase';
import { SendEmailVerificationTokenUseCase } from '../../../application/use-cases/SendEmailVerificationToken.usecase';

export class AuthController {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private authenticateUseCase: AuthenticateUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private revokeTokenUseCase: RevokeTokenUseCase,
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private changePasswordUseCase: ChangePasswordUseCase,
    private getMeUseCase: GetMeUseCase,
    private updateMeUseCase: UpdateMeUseCase,
    private validateTokenGuardUseCase: ValidateTokenGuardUseCase,
    private tokenSigner: ITokenSigner,
    private tokenExpiry: TokenExpiryConfig = {
      accessTokenExpiresInSec: 900,
      refreshTokenExpiresInSec: 604800,
      accessTokenMaxAgeMs: 15 * 60 * 1000,
      refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      emailVerificationTokenExpiresInSec: 900
    },
    private verifyEmailUseCase?: VerifyEmailUseCase,
    private sendEmailVerificationTokenUseCase?: SendEmailVerificationTokenUseCase,
    private cookieDomain?: string,
    private isProd: boolean = false
  ) { }

  private setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = this.isProd;
    const domain = this.cookieDomain;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain,
      maxAge: this.tokenExpiry.accessTokenMaxAgeMs
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain,
      maxAge: this.tokenExpiry.refreshTokenMaxAgeMs
    });
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, passwordConfirm, name, role, agreedToPolicy } = req.body;
    if (!email || !password || !passwordConfirm) {
      throw new ValidationError('Email, password, and password confirmation are required');
    }

    const result = await this.registerUserUseCase.execute({ 
      email, 
      password, 
      passwordConfirm, 
      name, 
      role,
      agreedToPolicy: Boolean(agreedToPolicy)
    });

    logger.info('User registration completed', {
      requestId: (req as any).requestId,
      userId: result.user.id,
      role: result.user.role,
      isVerificationRequired: result.isVerificationRequired,
    });

    sendSuccess(
      res,
      201,
      {
        message: 'User registered successfully. Please check your email to verify your account.',
        isVerificationRequired: result.isVerificationRequired,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          isEmailVerified: result.user.isEmailVerified,
          isPolicyAccepted: result.user.isPolicyAccepted,
        }
      }
    );
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const result = await this.authenticateUseCase.execute({ email, password });
    this.setCookies(res, result.accessToken, result.refreshToken);

    logger.info('User authentication succeeded', {
      requestId: (req as any).requestId,
      userId: result.user.id,
      role: result.user.role,
    });

    sendSuccess(res, 200, {
      message: 'Authenticated successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role
      }
    });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token missing');
    }

    try {
      const result = await this.refreshTokenUseCase.execute(refreshToken);
      this.setCookies(res, result.accessToken, result.refreshToken);

      logger.info('Token rotation succeeded', {
        requestId: (req as any).requestId,
      });

      sendSuccess(res, 200, { message: 'Token rotated successfully' });
    } catch (err) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      throw err;
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const accessToken = req.cookies?.access_token;
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

      if (accessToken) {
        await this.revokeTokenUseCase.execute({
          token: accessToken,
          type: 'ACCESS',
          expiresAt: new Date(Date.now() + this.tokenExpiry.accessTokenMaxAgeMs)
        });
      }

      if (refreshToken) {
        await this.revokeTokenUseCase.execute({
          token: refreshToken,
          type: 'REFRESH',
          expiresAt: new Date(Date.now() + this.tokenExpiry.refreshTokenMaxAgeMs)
        });
      }
    } catch (err) {
      // Continue clearing cookies even if revocation recording fails
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    sendSuccess(res, 200, { message: 'Logged out successfully' });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      throw new ValidationError('Please provide your email address');
    }

    const result = await this.requestPasswordResetUseCase.execute({ email });
    sendSuccess(res, 200, result);
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword || !confirmPassword) {
      throw new ValidationError('Please provide email, OTP code, new password, and password confirmation');
    }

    const result = await this.resetPasswordUseCase.execute({
      email,
      otp,
      newPassword,
      confirmPassword
    });
    sendSuccess(res, 200, result);
  };

  createEmailToken = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      throw new ValidationError('Email is required');
    }

    const result = await this.sendEmailVerificationTokenUseCase!.execute({ email });
    sendSuccess(res, 200, result);
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new ValidationError('Email and OTP code are required');
    }

    const result = await this.verifyEmailUseCase!.execute({ email, otp });
    sendSuccess(res, 200, result);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const { currentPassword, newPassword, passwordConfirm } = req.body;
    const accessToken = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies?.refresh_token;

    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    if (!currentPassword || !newPassword || !passwordConfirm) {
      throw new ValidationError('Please provide currentPassword, newPassword, and passwordConfirm');
    }

    await this.changePasswordUseCase.execute({
      userId,
      currentPassword,
      newPassword,
      passwordConfirm,
      accessToken,
      refreshToken
    });

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    sendSuccess(res, 200, { message: 'Password changed successfully. Please log in again with your new password.' });
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const user = await this.getMeUseCase.execute(userId);
    sendSuccess(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const { name } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const user = await this.updateMeUseCase.execute({ userId, name });
    sendSuccess(res, 200, {
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        isActive: user.isActive
      }
    });
  };

  validateToken = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const token = tokenFromHeader || req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = this.tokenSigner.verifyAccessToken(token);
    const userId = decoded.sub || decoded.id;

    await this.validateTokenGuardUseCase.execute({
      token,
      userId,
      decodedRole: decoded.role,
      tokenIat: decoded.iat
    });

    sendSuccess(res, 200, {
      valid: true,
      userId,
      email: decoded.email,
      role: decoded.role
    });
  };

  getJwks = async (req: Request, res: Response): Promise<void> => {
    const pubKey = this.tokenSigner.getPublicKey();
    res.status(200).send(pubKey);
  };
}

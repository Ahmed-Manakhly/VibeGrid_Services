import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUser.usecase';
import { AuthenticateUseCase } from '../../../application/use-cases/Authenticate.usecase';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshToken.usecase';
import { RevokeTokenUseCase } from '../../../application/use-cases/RevokeToken.usecase';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/RequestPasswordReset.usecase';
import { ResetPasswordUseCase } from '../../../application/use-cases/ResetPassword.usecase';
import { ChangePasswordUseCase } from '../../../application/use-cases/ChangePassword.usecase';
import { GetMeUseCase } from '../../../application/use-cases/GetMe.usecase';
import { UpdateMeUseCase } from '../../../application/use-cases/UpdateMe.usecase';
import { ValidateTokenGuardUseCase } from '../../../application/use-cases/ValidateTokenGuard.usecase';
import { RS256TokenSigner } from '../../../infrastructure/security/RS256TokenSigner';

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
    private tokenSigner: RS256TokenSigner
  ) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain,
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await this.registerUserUseCase.execute({ email, password, name });
      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(201).json({
        message: 'User registered successfully',
        user: result.user
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await this.authenticateUseCase.execute({ email, password });
      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        message: 'Authenticated successfully',
        user: result.user
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token missing' });
        return;
      }

      const result = await this.refreshTokenUseCase.execute(refreshToken);
      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({ message: 'Token rotated successfully' });
    } catch (err: any) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(401).json({ error: err.message });
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
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
      }

      if (refreshToken) {
        await this.revokeTokenUseCase.execute({
          token: refreshToken,
          type: 'REFRESH',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }
    } catch (err) {
      // Continue clearing cookies even if revocation recording fails
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).json({ message: 'Logged out successfully' });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Please provide your email address' });
        return;
      }

      const result = await this.requestPasswordResetUseCase.execute({ email });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;
      if (!email || !otp || !newPassword || !confirmPassword) {
        res.status(400).json({ error: 'Please provide email, OTP code, new password, and password confirmation' });
        return;
      }

      const result = await this.resetPasswordUseCase.execute({
        email,
        otp,
        newPassword,
        confirmPassword
      });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      const { currentPassword, newPassword } = req.body;
      const accessToken = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
      const refreshToken = req.cookies?.refresh_token;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Please provide currentPassword and newPassword' });
        return;
      }

      await this.changePasswordUseCase.execute({
        userId,
        currentPassword,
        newPassword,
        accessToken,
        refreshToken
      });

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(200).json({ message: 'Password changed successfully. Please log in again with your new password.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.getMeUseCase.execute(userId);
      res.status(200).json({
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
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      const { name } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.updateMeUseCase.execute({ userId, name });
      res.status(200).json({
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
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  validateToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
      const token = tokenFromHeader || req.cookies?.access_token;

      if (!token) {
        res.status(401).json({ valid: false, error: 'No token provided' });
        return;
      }

      const decoded = this.tokenSigner.verifyAccessToken(token);
      const userId = decoded.sub || decoded.id;

      await this.validateTokenGuardUseCase.execute({
        token,
        userId,
        decodedRole: decoded.role,
        tokenIat: decoded.iat
      });

      res.status(200).json({
        valid: true,
        userId,
        email: decoded.email,
        role: decoded.role
      });
    } catch (err: any) {
      res.status(401).json({ valid: false, error: err.message || 'Invalid or revoked token' });
    }
  };

  getJwks = async (req: Request, res: Response): Promise<void> => {
    const pubKey = this.tokenSigner.getPublicKey();
    res.status(200).send(pubKey);
  };
}

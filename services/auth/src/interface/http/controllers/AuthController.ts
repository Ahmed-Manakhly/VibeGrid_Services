import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUser.usecase';
import { AuthenticateUseCase } from '../../../application/use-cases/Authenticate.usecase';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshToken.usecase';
import { RevokeTokenUseCase } from '../../../application/use-cases/RevokeToken.usecase';
import { RS256TokenSigner } from '../../../infrastructure/security/RS256TokenSigner';

export class AuthController {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private authenticateUseCase: AuthenticateUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private revokeTokenUseCase: RevokeTokenUseCase,
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

  getJwks = async (req: Request, res: Response): Promise<void> => {
    const pubKey = this.tokenSigner.getPublicKey();
    res.status(200).send(pubKey);
  };
}

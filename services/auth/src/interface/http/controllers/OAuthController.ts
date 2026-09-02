import { Request, Response } from 'express';
import { OAuthLoginUseCase } from '../../../application/use-cases/OAuthLogin.usecase';
import { ValidationError } from '../../../application/errors/errors';
import { ApiResponse } from '../response/apiResponse';
import { TokenExpiryConfig } from '../../../config/env';

export class OAuthController {
  constructor(
    private oauthLoginUseCase: OAuthLoginUseCase,
    private tokenExpiry: TokenExpiryConfig = {
      accessTokenExpiresInSec: 900,
      refreshTokenExpiresInSec: 604800,
      accessTokenMaxAgeMs: 15 * 60 * 1000,
      refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      emailVerificationTokenExpiresInSec: 900
    }
  ) {}

  googleLogin = (req: Request, res: Response): void => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/oauth/google/callback';

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=email%20profile`;

    res.redirect(url);
  };

  googleCallback = async (req: Request, res: Response): Promise<void> => {
    const { code } = req.query;
    if (!code) {
      throw new ValidationError('Missing code parameter');
    }

    // Simulating OAuth token exchange in local testing mode
    const result = await this.oauthLoginUseCase.execute({
      provider: 'google',
      providerId: `google-user-${Date.now()}`,
      email: `google.user.${Date.now()}@example.com`,
      name: 'Google User'
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      maxAge: this.tokenExpiry.accessTokenMaxAgeMs
    });
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      maxAge: this.tokenExpiry.refreshTokenMaxAgeMs
    });

    ApiResponse.success(res, { message: 'Google OAuth login successful', user: result.user });
  };

  githubLogin = (req: Request, res: Response): void => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:8000/api/auth/oauth/github/callback';

    if (!clientId) {
      throw new Error('GITHUB_CLIENT_ID not configured');
    }

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=user:email`;

    res.redirect(url);
  };

  githubCallback = async (req: Request, res: Response): Promise<void> => {
    const { code } = req.query;
    if (!code) {
      throw new ValidationError('Missing code parameter');
    }

    const result = await this.oauthLoginUseCase.execute({
      provider: 'github',
      providerId: `github-user-${Date.now()}`,
      email: `github.user.${Date.now()}@example.com`,
      name: 'GitHub User'
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      maxAge: this.tokenExpiry.accessTokenMaxAgeMs
    });
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      maxAge: this.tokenExpiry.refreshTokenMaxAgeMs
    });

    ApiResponse.success(res, { message: 'GitHub OAuth login successful', user: result.user });
  };
}

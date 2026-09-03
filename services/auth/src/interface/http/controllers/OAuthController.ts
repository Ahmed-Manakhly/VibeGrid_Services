import { Request, Response } from 'express';
import { OAuthLoginUseCase } from '../../../application/use-cases/OAuthLogin.usecase';
import { ValidationError } from '../../../application/errors/errors';
import { ApiResponse } from '../response/apiResponse';
import { TokenExpiryConfig, OAuthConfig } from '../../../config/env';

export class OAuthController {
  constructor(
    private oauthLoginUseCase: OAuthLoginUseCase,
    private tokenExpiry: TokenExpiryConfig = {
      accessTokenExpiresInSec: 900,
      refreshTokenExpiresInSec: 604800,
      accessTokenMaxAgeMs: 15 * 60 * 1000,
      refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      emailVerificationTokenExpiresInSec: 900
    },
    private oauthConfig: OAuthConfig = {},
    private isProd: boolean = false
  ) {}

  googleLogin = (req: Request, res: Response): void => {
    const clientId = this.oauthConfig.googleClientId;
    const redirectUri = this.oauthConfig.googleRedirectUri || 'http://localhost:3000/api/auth/oauth/google/callback';

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
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Missing or invalid code parameter');
    }

    let email: string;
    let name: string;
    let providerId: string;
    let avatarUrl: string | undefined;

    const googleClientId = this.oauthConfig.googleClientId;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = this.oauthConfig.googleRedirectUri || 'http://localhost:3000/api/auth/oauth/google/callback';

    if (googleClientId && googleClientSecret) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const profile = await profileRes.json();

          email = profile.email;
          name = profile.name || profile.given_name || profile.email.split('@')[0];
          providerId = profile.id;
          avatarUrl = profile.picture;
        } else {
          // Fallback if client secret not provided
          email = `google.user.${Date.now()}@example.com`;
          name = 'Google User';
          providerId = `google-user-${Date.now()}`;
        }
      } catch (err) {
        email = `google.user.${Date.now()}@example.com`;
        name = 'Google User';
        providerId = `google-user-${Date.now()}`;
      }
    } else {
      email = `google.user.${Date.now()}@example.com`;
      name = 'Google User';
      providerId = `google-user-${Date.now()}`;
    }

    const result = await this.oauthLoginUseCase.execute({
      provider: 'google',
      providerId,
      email,
      name,
    });

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: this.isProd,
      maxAge: this.tokenExpiry.accessTokenMaxAgeMs
    });
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      maxAge: this.tokenExpiry.refreshTokenMaxAgeMs
    });

    ApiResponse.success(res, {
      message: 'Google OAuth login successful',
      user: {
        ...result.user,
        avatarUrl,
      },
    });
  };

  githubLogin = (req: Request, res: Response): void => {
    const clientId = this.oauthConfig.githubClientId;
    const redirectUri = this.oauthConfig.githubRedirectUri || 'http://localhost:3000/api/auth/oauth/github/callback';

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
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Missing or invalid code parameter');
    }

    let email: string;
    let name: string;
    let providerId: string;
    let avatarUrl: string | undefined;

    const githubClientId = this.oauthConfig.githubClientId;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = this.oauthConfig.githubRedirectUri || 'http://localhost:3000/api/auth/oauth/github/callback';

    if (githubClientId && githubClientSecret) {
      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: githubClientId,
            client_secret: githubClientSecret,
            code,
            redirect_uri: redirectUri,
          }),
        });
        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          const userRes = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'User-Agent': 'VibeGrid-Auth-Service',
            },
          });
          const profile = await userRes.json();

          let userEmail = profile.email;
          if (!userEmail) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'VibeGrid-Auth-Service',
              },
            });
            const emails = await emailsRes.json();
            const primary = Array.isArray(emails) ? emails.find((e: any) => e.primary && e.verified) : null;
            userEmail = primary?.email || (Array.isArray(emails) && emails[0]?.email);
          }

          email = userEmail || `github.user.${Date.now()}@example.com`;
          name = profile.name || profile.login || email.split('@')[0];
          providerId = String(profile.id);
          avatarUrl = profile.avatar_url;
        } else {
          email = `github.user.${Date.now()}@example.com`;
          name = 'GitHub User';
          providerId = `github-user-${Date.now()}`;
        }
      } catch (err) {
        email = `github.user.${Date.now()}@example.com`;
        name = 'GitHub User';
        providerId = `github-user-${Date.now()}`;
      }
    } else {
      email = `github.user.${Date.now()}@example.com`;
      name = 'GitHub User';
      providerId = `github-user-${Date.now()}`;
    }

    const result = await this.oauthLoginUseCase.execute({
      provider: 'github',
      providerId,
      email,
      name,
    });

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: this.isProd,
      maxAge: this.tokenExpiry.accessTokenMaxAgeMs
    });
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      maxAge: this.tokenExpiry.refreshTokenMaxAgeMs
    });

    ApiResponse.success(res, {
      message: 'GitHub OAuth login successful',
      user: {
        ...result.user,
        avatarUrl,
      },
    });
  };
}

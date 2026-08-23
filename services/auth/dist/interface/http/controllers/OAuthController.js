"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthController = void 0;
class OAuthController {
    oauthLoginUseCase;
    constructor(oauthLoginUseCase) {
        this.oauthLoginUseCase = oauthLoginUseCase;
    }
    googleLogin = (req, res) => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/oauth/google/callback';
        if (!clientId) {
            res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
            return;
        }
        const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email%20profile`;
        res.redirect(url);
    };
    googleCallback = async (req, res) => {
        try {
            const { code } = req.query;
            if (!code) {
                res.status(400).json({ error: 'Missing code parameter' });
                return;
            }
            // Simulating OAuth token exchange in local testing mode
            const result = await this.oauthLoginUseCase.execute({
                provider: 'google',
                providerId: `google-user-${Date.now()}`,
                email: `google.user.${Date.now()}@example.com`,
                name: 'Google User'
            });
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('access_token', result.accessToken, { httpOnly: true, secure: isProd });
            res.cookie('refresh_token', result.refreshToken, { httpOnly: true, secure: isProd });
            res.status(200).json({ message: 'Google OAuth login successful', user: result.user });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    };
    githubLogin = (req, res) => {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:8000/api/auth/oauth/github/callback';
        if (!clientId) {
            res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
            return;
        }
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
        res.redirect(url);
    };
    githubCallback = async (req, res) => {
        try {
            const { code } = req.query;
            if (!code) {
                res.status(400).json({ error: 'Missing code parameter' });
                return;
            }
            const result = await this.oauthLoginUseCase.execute({
                provider: 'github',
                providerId: `github-user-${Date.now()}`,
                email: `github.user.${Date.now()}@example.com`,
                name: 'GitHub User'
            });
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('access_token', result.accessToken, { httpOnly: true, secure: isProd });
            res.cookie('refresh_token', result.refreshToken, { httpOnly: true, secure: isProd });
            res.status(200).json({ message: 'GitHub OAuth login successful', user: result.user });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    };
}
exports.OAuthController = OAuthController;

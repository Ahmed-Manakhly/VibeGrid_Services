import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export interface TokenExpiryConfig {
  accessTokenExpiresInSec: number;
  refreshTokenExpiresInSec: number;
  accessTokenMaxAgeMs: number;
  refreshTokenMaxAgeMs: number;
  emailVerificationTokenExpiresInSec: number;
}

export interface OAuthConfig {
  googleClientId?: string;
  googleRedirectUri?: string;
  githubClientId?: string;
  githubRedirectUri?: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test' | 'docker_development';
  mongoUri: string;
  rabbitmqUrl: string;
  jwtPrivateKeyPath: string;
  jwtPublicKeyPath: string;
  cookieDomain?: string;
  tokenExpiry: TokenExpiryConfig;
  smtp: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  };
  oauth: OAuthConfig;
  bootstrapAdmin?: {
    email?: string;
    password?: string;
    name?: string;
  };
  bootstrapDev?: {
    email?: string;
    password?: string;
    name?: string;
  };
}

export function loadAndValidateConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development';
  const port = parseInt(process.env.PORT || '8001', 10);
  const mongoUri = process.env.MONGO_URI;
  const rabbitmqUrl = process.env.RABBITMQ_URL;

  if (!mongoUri && nodeEnv === 'production') {
    throw new Error('[Config Error] MONGO_URI is required in production environment');
  }

  if (!rabbitmqUrl && nodeEnv === 'production') {
    throw new Error('[Config Error] RABBITMQ_URL is required in production environment');
  }

  // ── Startup Environment Variable Validation ─────────────────────────────
  const requiredEnvVars = ['MONGO_URI', 'RABBITMQ_URL', 'GOOGLE_CLIENT_ID', 'GITHUB_CLIENT_ID'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    if (nodeEnv === 'production') {
      throw new Error(`[Config Error] Missing required environment variables: ${missingVars.join(', ')}`);
    } else {
      console.warn(`⚠️ [Config Warning] Missing optional local env vars: ${missingVars.join(', ')} (using fallback dev defaults)`);
    }
  }

  const defaultPrivatePath = path.resolve(__dirname, '../../secrets/jwt.private.key');
  const defaultPublicPath = path.resolve(__dirname, '../../secrets/jwt.public.key');

  const jwtPrivateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || defaultPrivatePath;
  const jwtPublicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || defaultPublicPath;

  if (nodeEnv === 'production') {
    if (!fs.existsSync(jwtPrivateKeyPath)) {
      throw new Error(`[Config Error] RSA private key missing at path: ${jwtPrivateKeyPath}`);
    }
    if (!fs.existsSync(jwtPublicKeyPath)) {
      throw new Error(`[Config Error] RSA public key missing at path: ${jwtPublicKeyPath}`);
    }
  }

  const accessTokenExpiresInSec = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN_SEC || '900', 10);
  const refreshTokenExpiresInSec = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN_SEC || '604800', 10);
  const emailVerificationTokenExpiresInSec = parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_SEC || '900', 10);

  if (isNaN(accessTokenExpiresInSec) || accessTokenExpiresInSec <= 0) {
    throw new Error('[Config Error] JWT_ACCESS_TOKEN_EXPIRES_IN_SEC must be a positive integer');
  }
  if (isNaN(refreshTokenExpiresInSec) || refreshTokenExpiresInSec <= 0) {
    throw new Error('[Config Error] JWT_REFRESH_TOKEN_EXPIRES_IN_SEC must be a positive integer');
  }
  if (isNaN(emailVerificationTokenExpiresInSec) || emailVerificationTokenExpiresInSec <= 0) {
    throw new Error('[Config Error] EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_SEC must be a positive integer');
  }

  let formattedMongoUri = mongoUri || 'mongodb://localhost:27017/auth_db';

  // Fix: URL-encode credentials if MONGO_URI contains raw special characters
  try {
    if (formattedMongoUri.includes('@') && formattedMongoUri.startsWith('mongodb://')) {
      const parts = formattedMongoUri.replace('mongodb://', '').split('@');
      const creds = parts[0].split(':');
      if (creds.length === 2) {
        const user = encodeURIComponent(decodeURIComponent(creds[0]));
        const pass = encodeURIComponent(decodeURIComponent(creds[1]));
        formattedMongoUri = `mongodb://${user}:${pass}@${parts[1]}`;
      }
    }
  } catch (e) {
    // Fallback to original if parsing fails
  }

  return {
    port,
    nodeEnv,
    mongoUri: formattedMongoUri,
    rabbitmqUrl: rabbitmqUrl || 'amqp://localhost:5672',
    jwtPrivateKeyPath,
    jwtPublicKeyPath,
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    tokenExpiry: {
      accessTokenExpiresInSec,
      refreshTokenExpiresInSec,
      accessTokenMaxAgeMs: accessTokenExpiresInSec * 1000,
      refreshTokenMaxAgeMs: refreshTokenExpiresInSec * 1000,
      emailVerificationTokenExpiresInSec
    },
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 2525,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.EMAIL_FROM || '"VibeGrid Support" <noreply@vibegrid.com>'
    },
    oauth: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/oauth/google/callback',
      githubClientId: process.env.GITHUB_CLIENT_ID,
      githubRedirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:8000/api/auth/oauth/github/callback'
    },
    bootstrapAdmin: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME || 'System Admin'
    },
    bootstrapDev: {
      email: process.env.DEV_USER_EMAIL,
      password: process.env.DEV_USER_PASSWORD,
      name: process.env.DEV_USER_NAME || 'Developer'
    }
  };
}

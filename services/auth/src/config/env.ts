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
  const port = parseInt(process.env.PORT || '3001', 10);
  const mongoUri = process.env.MONGO_URI;
  const rabbitmqUrl = process.env.RABBITMQ_URL;

  if (!mongoUri && nodeEnv === 'production') {
    throw new Error('[Config Error] MONGO_URI is required in production environment');
  }

  if (!rabbitmqUrl && nodeEnv === 'production') {
    throw new Error('[Config Error] RABBITMQ_URL is required in production environment');
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

  return {
    port,
    nodeEnv,
    mongoUri: mongoUri || 'mongodb://localhost:27017/auth_db',
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
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || 'VibeGrid Auth <noreply@vibegrid.local>'
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

import dotenv from 'dotenv';

dotenv.config();

export interface EmailAppConfig {
  port: number;
  nodeEnv: string;
  rabbitUrl: string;
  redisUrl: string;
  smtp: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
  };
}

export function loadAndValidateEmailConfig(): EmailAppConfig {
  const port = parseInt(process.env.PORT || '8003', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';

  const rabbitUrl = process.env.RABBITMQ_URL;
  let redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (nodeEnv === 'docker_development') {
      redisUrl = process.env.REDIS_URL_DOCKER_DEV;
    } else if (nodeEnv === 'production') {
      redisUrl = process.env.REDIS_URL_PROD;
    } else {
      redisUrl = process.env.REDIS_URL_DEV;
    }
  }

  const missingVars: string[] = [];
  if (!rabbitUrl) missingVars.push('RABBITMQ_URL');
  if (!redisUrl) missingVars.push('REDIS_URL');

  if (missingVars.length > 0) {
    throw new Error(`[Config Error] Missing required environment variables in Email Service: ${missingVars.join(', ')}`);
  }

  let formattedRedisUrl = redisUrl || 'redis://localhost:6379';
  try {
    if (formattedRedisUrl.includes('@') && formattedRedisUrl.startsWith('redis://')) {
      const parts = formattedRedisUrl.replace('redis://', '').split('@');
      const creds = parts[0].split(':');
      if (creds.length === 2) {
        const user = encodeURIComponent(decodeURIComponent(creds[0]));
        const pass = encodeURIComponent(decodeURIComponent(creds[1]));
        formattedRedisUrl = `redis://${user}:${pass}@${parts[1]}`;
      }
    }
  } catch (e) {
    // Fallback to original if parsing fails
  }

  return {
    port,
    nodeEnv,
    rabbitUrl: rabbitUrl!,
    redisUrl: formattedRedisUrl,
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || "",
    },
  };
}

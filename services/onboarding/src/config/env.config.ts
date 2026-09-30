import dotenv from 'dotenv';

dotenv.config();

export interface OnboardingAppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  rabbitUrl: string;
  redisUrl: string;
  prismaDbPush: boolean;
}

export function loadAndValidateOnboardingConfig(): OnboardingAppConfig {
  const port = parseInt(process.env.PORT || '8004', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';

  const databaseUrl = process.env.DATABASE_URL;
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
  if (!databaseUrl) missingVars.push('DATABASE_URL');
  if (!rabbitUrl) missingVars.push('RABBITMQ_URL');
  if (!redisUrl) missingVars.push('REDIS_URL');

  if (missingVars.length > 0) {
    throw new Error(`[Config Error] Missing required environment variables in Onboarding Service: ${missingVars.join(', ')}`);
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

  const prismaDbPush = process.env.PRISMA_DB_PUSH === 'true' || nodeEnv === 'development';

  return {
    port,
    nodeEnv,
    databaseUrl: databaseUrl!,
    rabbitUrl: rabbitUrl!,
    redisUrl: formattedRedisUrl,
    prismaDbPush,
  };
}

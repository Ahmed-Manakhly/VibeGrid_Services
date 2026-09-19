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
  const redisUrl = process.env.REDIS_URL;

  const missingVars: string[] = [];
  if (!databaseUrl) missingVars.push('DATABASE_URL');
  if (!rabbitUrl) missingVars.push('RABBITMQ_URL');
  if (!redisUrl) missingVars.push('REDIS_URL');

  if (missingVars.length > 0) {
    throw new Error(`[Config Error] Missing required environment variables in Onboarding Service: ${missingVars.join(', ')}`);
  }

  const prismaDbPush = process.env.PRISMA_DB_PUSH === 'true' || nodeEnv === 'development';

  return {
    port,
    nodeEnv,
    databaseUrl: databaseUrl!,
    rabbitUrl: rabbitUrl!,
    redisUrl: redisUrl!,
    prismaDbPush,
  };
}

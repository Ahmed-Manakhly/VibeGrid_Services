import dotenv from 'dotenv';

dotenv.config();

export interface OnboardingAppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  rabbitUrl: string;
  redisUrl: string;
}

export function loadAndValidateOnboardingConfig(): OnboardingAppConfig {
  const port = parseInt(process.env.PORT || '8004', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://vibegrid:VgDB_P2026%23k9%24XmL%218qWz@localhost:5432/vibegrid_db?schema=public';
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://vibegrid:VgRabbit_MQ2026%23b5%24WvL%212jRx@localhost:5672';
  const redisUrl = process.env.REDIS_URL || 'redis://:VgRedis_R2026%23m4%24ZpQ%219wKx@localhost:6379';

  return {
    port,
    nodeEnv,
    databaseUrl,
    rabbitUrl,
    redisUrl,
  };
}

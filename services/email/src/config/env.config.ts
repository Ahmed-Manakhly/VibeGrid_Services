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
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://vibegrid:VgRabbit_MQ2026%23b5%24WvL%212jRx@localhost:5672';
  const redisUrl = process.env.REDIS_URL || 'redis://:VgRedis_R2026%23m4%24ZpQ%219wKx@localhost:6379';

  return {
    port,
    nodeEnv,
    rabbitUrl,
    redisUrl,
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || 'VibeGrid Support <no-reply@vibegrid.com>',
    },
  };
}

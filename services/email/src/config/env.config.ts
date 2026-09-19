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
  const redisUrl = process.env.REDIS_URL;

  const missingVars: string[] = [];
  if (!rabbitUrl) missingVars.push('RABBITMQ_URL');
  if (!redisUrl) missingVars.push('REDIS_URL');

  if (missingVars.length > 0) {
    throw new Error(`[Config Error] Missing required environment variables in Email Service: ${missingVars.join(', ')}`);
  }

  return {
    port,
    nodeEnv,
    rabbitUrl: rabbitUrl!,
    redisUrl: redisUrl!,
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || "",
    },
  };
}

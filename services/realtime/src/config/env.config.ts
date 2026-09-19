import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface RealtimeConfig {
  port: number;
  redisUrl: string;
  jwtPublicKeyPath?: string;
  jwtPublicKey?: string;
  nodeEnv: string;
  allowedOrigins: string[];
}


export function getRealtimeConfig(): RealtimeConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('[Config Error] Missing required environment variable in Realtime Service: REDIS_URL');
  }

  const defaultKeyPath = path.resolve(__dirname, '../../../auth/secrets/jwt.public.key');
  return {
    port: parseInt(process.env.PORT || '8005', 10),
    redisUrl,
    jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || defaultKeyPath,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY,
    nodeEnv,
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(','),
  };
}

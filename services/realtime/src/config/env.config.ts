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

  let formattedRedisUrl = redisUrl;
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

  const defaultKeyPath = path.resolve(__dirname, '../../../auth/secrets/jwt.public.key');
  return {
    port: parseInt(process.env.PORT || '8005', 10),
    redisUrl: formattedRedisUrl,
    jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || defaultKeyPath,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY,
    nodeEnv,
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(','),
  };
}

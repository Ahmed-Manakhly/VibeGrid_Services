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

export const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtbGtIE/yX82dLxmg6kXl
kmxCvSFzqcwi4ZH9R+a2UKd17hQ7weLDASrCPwJz9ZO3nkjTINvOAsTcHhxhfxpB
3RN+CC7OqoyENbVDUjdp233+z9SvahyueKpLgUVz67bE7C/U9qR94LO8RmDLNr53
CbcDfVNpm901FWnnuZkLZ27JqJlLzXFVjCSwQ579LUkd+3nQRaFg5GT1PbyU5HNq
9out2VRwaAaqJCYrRq+HJVlNV5s5JquVAi0m9Z7jh53o7EWV/O3e53sfFmfRqgIG
72lyEZHge7M+Obge05OWp9mglzdJJzcKevDvr1TTse+OVTvf5PjGGWlYR9npv0vY
8wIDAQAB
-----END PUBLIC KEY-----`;

export function getRealtimeConfig(): RealtimeConfig {
  const defaultKeyPath = path.resolve(__dirname, '../../../auth/secrets/jwt.public.key');
  return {
    port: parseInt(process.env.PORT || '8005', 10),
    redisUrl: process.env.REDIS_URL || 'redis://:VgRedis_R2026%23m4%24ZpQ%219wKx@localhost:6379',
    jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || defaultKeyPath,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY,
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(','),
  };
}

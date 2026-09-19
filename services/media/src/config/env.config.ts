import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface MediaAppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  minio: {
    internalEndpoint: string;
    publicEndpoint: string;
    region: string;
    user: string;
    pass: string;
    bucket: string;
  };
  jwtPublicKeyPath: string;
}

export function loadAndValidateMediaConfig(): MediaAppConfig {
  const port = parseInt(process.env.PORT || '8002', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';

  const mongoUri = process.env.MONGO_URI;
  const minioUser = process.env.MINIO_USER;
  const minioPass = process.env.MINIO_PASS;

  const missingVars: string[] = [];
  if (!mongoUri) missingVars.push('MONGO_URI');
  if (!minioUser) missingVars.push('MINIO_USER');
  if (!minioPass) missingVars.push('MINIO_PASS');

  if (missingVars.length > 0) {
    throw new Error(`[Config Error] Missing required environment variables in Media Service: ${missingVars.join(', ')}`);
  }

  const defaultPublicKeyPath = path.resolve(__dirname, '../../secrets/jwt.public.key');
  const jwtPublicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || defaultPublicKeyPath;

  return {
    port,
    nodeEnv,
    mongoUri: mongoUri!,
    minio: {
      internalEndpoint: process.env.MINIO_INTERNAL_ENDPOINT || 'http://localhost:9000',
      publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000',
      region: process.env.MINIO_REGION || 'us-east-1',
      user: minioUser!,
      pass: minioPass!,
      bucket: process.env.MINIO_BUCKET || 'vibegrid-media',
    },
    jwtPublicKeyPath,
  };
}

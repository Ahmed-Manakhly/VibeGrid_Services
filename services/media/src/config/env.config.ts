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
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '8002', 10);
  const mongoUri = process.env.MONGO_URI || 'mongodb://admin:VgMongo_A2026%23u7%24YnR%213vTz@localhost:27017/media_db?authSource=admin';

  const defaultPublicKeyPath = path.resolve(__dirname, '../../secrets/jwt.public.key');
  const jwtPublicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || defaultPublicKeyPath;

  return {
    port,
    nodeEnv,
    mongoUri,
    minio: {
      internalEndpoint: process.env.MINIO_INTERNAL_ENDPOINT || 'http://localhost:9000',
      publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000',
      region: process.env.MINIO_REGION || 'us-east-1',
      user: process.env.MINIO_USER || 'minioadmin',
      pass: process.env.MINIO_PASS || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'vibegrid-media',
    },
    jwtPublicKeyPath,
  };
}

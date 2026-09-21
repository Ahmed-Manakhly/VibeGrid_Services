import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { createLogger, createExpressHttpLogger } from '@vibegrid/logger';

import { MinioS3StorageProvider } from './infrastructure/storage/MinioS3StorageProvider';
import { MongoMediaAssetRepository } from './infrastructure/persistence/MongoMediaAssetRepository';

import { CreateUploadIntentUseCase } from './application/use-cases/CreateUploadIntentUseCase';
import { ConfirmUploadUseCase } from './application/use-cases/ConfirmUploadUseCase';
import { GetMediaAssetUseCase } from './application/use-cases/GetMediaAssetUseCase';

import { createMediaAuthMiddleware } from './interface/http/middleware/mediaAuthMiddleware';
import { MediaController } from './interface/http/controllers/MediaController';

import { loadAndValidateMediaConfig } from './config/env.config';

const config = loadAndValidateMediaConfig();
const app = express();
const logger = createLogger('vibegrid-media');

app.use(createExpressHttpLogger(logger, 'vibegrid-media'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health & Readiness
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'media' }));
app.get('/ready', (req, res) => res.json({ status: 'ready', service: 'media' }));
app.get('/api/media/health', (req, res) => res.json({ status: 'healthy', service: 'media' }));
app.get('/api/media/ready', (req, res) => res.json({ status: 'ready', service: 'media' }));

// DI Setup
const storageProvider = new MinioS3StorageProvider({
  internalEndpoint: config.minio.internalEndpoint,
  publicEndpoint: config.minio.publicEndpoint,
  region: config.minio.region,
  accessKeyId: config.minio.user,
  secretAccessKey: config.minio.pass,
  bucketName: config.minio.bucket,
});

const mediaRepo = new MongoMediaAssetRepository();

const createUploadIntentUseCase = new CreateUploadIntentUseCase(mediaRepo, storageProvider);
const confirmUploadUseCase = new ConfirmUploadUseCase(mediaRepo, storageProvider);
const getMediaAssetUseCase = new GetMediaAssetUseCase(mediaRepo, storageProvider);

const controller = new MediaController(createUploadIntentUseCase, confirmUploadUseCase, getMediaAssetUseCase);
const authMiddleware = createMediaAuthMiddleware(config.jwtPublicKeyPath);

// Express Router wiring
app.post('/api/media/upload-intent', authMiddleware, controller.uploadIntent);
app.post('/api/media/confirm-upload', authMiddleware, controller.confirmUpload);
app.get('/api/media/assets/:assetId', authMiddleware, controller.getAsset);

async function startServer() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to Media MongoDB');

    app.listen(config.port, () => {
      logger.info(`Media Microservice listening on port ${config.port}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Media Microservice', { error: err.message });
    process.exit(1);
  }
}

if (config.nodeEnv !== 'test') {
  startServer();
}

export default app;

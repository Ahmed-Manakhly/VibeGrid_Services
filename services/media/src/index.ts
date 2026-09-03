import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

import { MinioS3StorageProvider } from './infrastructure/storage/MinioS3StorageProvider';
import { MongoMediaAssetRepository } from './infrastructure/persistence/MongoMediaAssetRepository';
import { WinstonLogger } from './infrastructure/logging/WinstonLogger';

import { CreateUploadIntentUseCase } from './application/use-cases/CreateUploadIntentUseCase';
import { ConfirmUploadUseCase } from './application/use-cases/ConfirmUploadUseCase';
import { GetMediaAssetUseCase } from './application/use-cases/GetMediaAssetUseCase';

import { createMediaAuthMiddleware } from './interface/http/middleware/mediaAuthMiddleware';
import { MediaController } from './interface/http/controllers/MediaController';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3002', 10);
const logger = new WinstonLogger();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health & Readiness
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'media' }));
app.get('/ready', (req, res) => res.json({ status: 'ready', service: 'media' }));

// DI Setup
const storageProvider = new MinioS3StorageProvider({
  internalEndpoint: process.env.MINIO_INTERNAL_ENDPOINT || 'http://vibegrid_minio:9000',
  publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  accessKeyId: process.env.MINIO_USER || 'minioadmin',
  secretAccessKey: process.env.MINIO_PASS || 'VgMinio_S2026#h8$FdT!6pNs',
  bucketName: process.env.MINIO_BUCKET || 'vibegrid-media',
});

const mediaRepo = new MongoMediaAssetRepository();

const createUploadIntentUseCase = new CreateUploadIntentUseCase(mediaRepo, storageProvider);
const confirmUploadUseCase = new ConfirmUploadUseCase(mediaRepo, storageProvider);
const getMediaAssetUseCase = new GetMediaAssetUseCase(mediaRepo, storageProvider);

const controller = new MediaController(createUploadIntentUseCase, confirmUploadUseCase, getMediaAssetUseCase);
const authMiddleware = createMediaAuthMiddleware();

// Express Router wiring
app.post('/api/media/upload-intent', authMiddleware, controller.uploadIntent);
app.post('/api/media/confirm-upload', authMiddleware, controller.confirmUpload);
app.get('/api/media/assets/:assetId', authMiddleware, controller.getAsset);

async function startServer() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://admin:VgMongo_A2026%23u7%24YnR%213vTz@localhost:27017/media_db?authSource=admin';
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to Media MongoDB');

    app.listen(port, () => {
      logger.info(`Media Microservice listening on port ${port}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Media Microservice', { error: err.message });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

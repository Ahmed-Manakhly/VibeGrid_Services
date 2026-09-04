import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/mediaAuthMiddleware';
import { CreateUploadIntentUseCase } from '../../../application/use-cases/CreateUploadIntentUseCase';
import { ConfirmUploadUseCase } from '../../../application/use-cases/ConfirmUploadUseCase';
import { GetMediaAssetUseCase } from '../../../application/use-cases/GetMediaAssetUseCase';
import { MediaApplicationError } from '../../../application/errors/MediaApplicationError';
import { DomainError } from '../../../domain/errors/DomainError';
import { MediaPurpose } from '../../../domain/value-objects/MediaFileConfig';

export class MediaController {
  constructor(
    private createUploadIntentUseCase: CreateUploadIntentUseCase,
    private confirmUploadUseCase: ConfirmUploadUseCase,
    private getMediaAssetUseCase: GetMediaAssetUseCase
  ) {}

  uploadIntent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      const { mimeType, fileSizeBytes, size, purpose = 'avatar' } = req.body;
      const rawSize = fileSizeBytes !== undefined ? fileSizeBytes : size;
      const parsedSize = Number(rawSize);

      const result = await this.createUploadIntentUseCase.execute({
        ownerId: req.user.userId,
        mimeType,
        fileSizeBytes: isNaN(parsedSize) ? 0 : parsedSize,
        purpose: purpose as MediaPurpose,
      });

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof MediaApplicationError) {
        res.status(err.statusCode).json({ status: 'error', message: err.message });
        return;
      }
      if (err instanceof DomainError || err.name === 'ValidationError' || err.name === 'CastError') {
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }
      next(err);
    }
  };

  confirmUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      const { assetId } = req.body;
      const result = await this.confirmUploadUseCase.execute({
        assetId,
        ownerId: req.user.userId,
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof MediaApplicationError) {
        res.status(err.statusCode).json({ status: 'error', message: err.message });
        return;
      }
      if (err instanceof DomainError) {
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }
      next(err);
    }
  };

  getAsset = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      const { assetId } = req.params;
      const result = await this.getMediaAssetUseCase.execute({ assetId, ownerId: req.user.userId });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof MediaApplicationError) {
        res.status(err.statusCode).json({ status: 'error', message: err.message });
        return;
      }
      if (err instanceof DomainError) {
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }
      next(err);
    }
  };
}

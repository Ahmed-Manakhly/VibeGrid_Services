import * as crypto from 'crypto';
import { IMediaAssetRepository } from '../../domain/ports/IMediaAssetRepository';
import { IStorageProvider } from '../../domain/ports/IStorageProvider';
import { MediaAsset } from '../../domain/entities/MediaAsset';
import { MediaFileConfig, MediaPurpose } from '../../domain/value-objects/MediaFileConfig';
import { DomainError } from '../../domain/errors/DomainError';
import { ValidationError } from '../errors/MediaApplicationError';

export interface CreateUploadIntentInput {
  ownerId: string;
  mimeType: string;
  fileSizeBytes: number;
  purpose: MediaPurpose;
}

export interface CreateUploadIntentOutput {
  assetId: string;
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export class CreateUploadIntentUseCase {
  constructor(
    private readonly mediaRepo: IMediaAssetRepository,
    private readonly storageProvider: IStorageProvider
  ) {}

  async execute(input: CreateUploadIntentInput): Promise<CreateUploadIntentOutput> {
    // 1. Domain validation
    try {
      MediaFileConfig.validate(input.mimeType, input.fileSizeBytes, input.purpose);
    } catch (err) {
      if (err instanceof DomainError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }

    // 2. Generate server-controlled assetId and objectKey
    const assetId = `ast_${crypto.randomUUID()}`;
    const ext = input.mimeType.split('/')[1] || 'png';
    const objectKey = `media/${input.ownerId}/${assetId}.${ext}`;

    // 3. Request presigned upload URL BEFORE persisting
    const presigned = await this.storageProvider.generatePresignedUploadUrl(objectKey, input.mimeType, 900);

    // 4. Persist PENDING MediaAsset
    const asset = new MediaAsset({
      id: assetId,
      ownerId: input.ownerId,
      objectKey,
      mimeType: input.mimeType,
      size: input.fileSizeBytes,
      purpose: input.purpose,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.mediaRepo.save(asset);

    return {
      assetId,
      uploadUrl: presigned.uploadUrl,
      objectKey,
      expiresInSeconds: presigned.expiresInSeconds,
    };
  }
}

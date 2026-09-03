import { IMediaAssetRepository } from '../../domain/ports/IMediaAssetRepository';
import { IStorageProvider } from '../../domain/ports/IStorageProvider';
import { DomainError } from '../../domain/errors/DomainError';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError
} from '../errors/MediaApplicationError';

export interface ConfirmUploadInput {
  assetId: string;
  ownerId: string;
}

export interface ConfirmUploadOutput {
  assetId: string;
  publicUrl: string;
  status: 'READY';
}

export class ConfirmUploadUseCase {
  constructor(
    private readonly mediaRepo: IMediaAssetRepository,
    private readonly storageProvider: IStorageProvider
  ) {}

  async execute(input: ConfirmUploadInput): Promise<ConfirmUploadOutput> {
    // 1. Fetch MediaAsset
    const asset = await this.mediaRepo.findById(input.assetId);
    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }

    // 2. Ownership verification
    if (asset.ownerId !== input.ownerId) {
      throw new ForbiddenError('Unauthorized: You do not own this media asset');
    }

    // 3. Status verification
    if (asset.status !== 'PENDING') {
      throw new ConflictError(`Asset is already in state: ${asset.status}`);
    }

    // 4. Verify object in storage (ContentLength AND ContentType)
    const metadata = await this.storageProvider.verifyObjectMetadata(asset.objectKey);
    if (!metadata) {
      throw new NotFoundError('Object not found in storage bucket');
    }

    if (metadata.contentLength !== asset.size) {
      throw new ValidationError(`Content length mismatch: expected ${asset.size}, found ${metadata.contentLength}`);
    }

    if (metadata.contentType && metadata.contentType.toLowerCase() !== asset.mimeType.toLowerCase()) {
      throw new ValidationError(`Content type mismatch: expected ${asset.mimeType}, found ${metadata.contentType}`);
    }

    // 5. Domain state transition to READY
    try {
      asset.markReady();
    } catch (err) {
      if (err instanceof DomainError) {
        throw new ConflictError(err.message);
      }
      throw err;
    }

    await this.mediaRepo.update(asset);

    const publicUrl = this.storageProvider.getPublicReadUrl(asset.objectKey);

    return {
      assetId: asset.id,
      publicUrl,
      status: 'READY',
    };
  }
}

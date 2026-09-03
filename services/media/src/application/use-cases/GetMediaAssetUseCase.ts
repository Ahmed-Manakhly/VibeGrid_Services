import { IMediaAssetRepository } from '../../domain/ports/IMediaAssetRepository';
import { IStorageProvider } from '../../domain/ports/IStorageProvider';
import { MediaAssetStatus } from '../../domain/entities/MediaAsset';
import { NotFoundError, ForbiddenError } from '../errors/MediaApplicationError';

export interface GetMediaAssetInput {
  assetId: string;
  ownerId: string;
}

export interface GetMediaAssetOutput {
  id: string;
  ownerId: string;
  status: MediaAssetStatus;
  mimeType: string;
  size: number;
  publicUrl: string;
  createdAt: Date;
}

export class GetMediaAssetUseCase {
  constructor(
    private readonly mediaRepo: IMediaAssetRepository,
    private readonly storageProvider: IStorageProvider
  ) {}

  async execute(input: GetMediaAssetInput): Promise<GetMediaAssetOutput> {
    const asset = await this.mediaRepo.findById(input.assetId);
    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }

    if (asset.ownerId !== input.ownerId) {
      throw new ForbiddenError('Unauthorized: You do not own this media asset');
    }

    return {
      id: asset.id,
      ownerId: asset.ownerId,
      status: asset.status,
      mimeType: asset.mimeType,
      size: asset.size,
      publicUrl: this.storageProvider.getPublicReadUrl(asset.objectKey),
      createdAt: asset.createdAt,
    };
  }
}

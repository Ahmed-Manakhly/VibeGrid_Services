import { MediaAsset } from '../entities/MediaAsset';

export interface IMediaAssetRepository {
  save(asset: MediaAsset): Promise<void>;
  findById(id: string): Promise<MediaAsset | null>;
  update(asset: MediaAsset): Promise<void>;
}

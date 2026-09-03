import mongoose, { Schema, Document } from 'mongoose';
import { IMediaAssetRepository } from '../../domain/ports/IMediaAssetRepository';
import { MediaAsset, MediaAssetStatus } from '../../domain/entities/MediaAsset';
import { MediaPurpose } from '../../domain/value-objects/MediaFileConfig';

export interface IMediaAssetDocument extends Document {
  assetId: string;
  ownerId: string;
  objectKey: string;
  mimeType: string;
  size: number;
  purpose: MediaPurpose;
  status: MediaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAssetDocument>(
  {
    assetId: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    objectKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    purpose: { type: String, required: true },
    status: { type: String, required: true, enum: ['PENDING', 'READY', 'FAILED'], index: true },
  },
  {
    timestamps: true,
  }
);

export const MediaAssetModel = mongoose.model<IMediaAssetDocument>('MediaAsset', MediaAssetSchema);

export class MongoMediaAssetRepository implements IMediaAssetRepository {
  async save(asset: MediaAsset): Promise<void> {
    const json = asset.toJSON();
    await MediaAssetModel.create({
      assetId: json.id,
      ownerId: json.ownerId,
      objectKey: json.objectKey,
      mimeType: json.mimeType,
      size: json.size,
      purpose: json.purpose,
      status: json.status,
    });
  }

  async findById(id: string): Promise<MediaAsset | null> {
    const doc = await MediaAssetModel.findOne({ assetId: id });
    if (!doc) return null;

    return new MediaAsset({
      id: doc.assetId,
      ownerId: doc.ownerId,
      objectKey: doc.objectKey,
      mimeType: doc.mimeType,
      size: doc.size,
      purpose: doc.purpose as MediaPurpose,
      status: doc.status as MediaAssetStatus,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async update(asset: MediaAsset): Promise<void> {
    const json = asset.toJSON();
    await MediaAssetModel.updateOne(
      { assetId: json.id },
      {
        $set: {
          status: json.status,
          updatedAt: json.updatedAt,
        },
      }
    );
  }
}

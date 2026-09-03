import { InvalidMediaTransitionError, InvalidMediaFileError } from '../errors/DomainError';
import { MediaPurpose } from '../value-objects/MediaFileConfig';

export type MediaAssetStatus = 'PENDING' | 'READY' | 'FAILED';

export interface MediaAssetProps {
  id: string;
  ownerId: string;
  objectKey: string;
  mimeType: string;
  size: number;
  purpose: MediaPurpose;
  status: MediaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MediaAsset {
  constructor(private props: MediaAssetProps) {
    if (!props.id || props.id.trim() === '') {
      throw new InvalidMediaFileError('MediaAsset id is required');
    }
    if (!props.ownerId || props.ownerId.trim() === '') {
      throw new InvalidMediaFileError('MediaAsset ownerId is required');
    }
    if (!props.objectKey || props.objectKey.trim() === '') {
      throw new InvalidMediaFileError('MediaAsset objectKey is required');
    }
    if (props.size <= 0) {
      throw new InvalidMediaFileError('MediaAsset size must be positive');
    }
  }

  get id(): string { return this.props.id; }
  get ownerId(): string { return this.props.ownerId; }
  get objectKey(): string { return this.props.objectKey; }
  get mimeType(): string { return this.props.mimeType; }
  get size(): number { return this.props.size; }
  get purpose(): MediaPurpose { return this.props.purpose; }
  get status(): MediaAssetStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  public markReady(): void {
    if (this.props.status !== 'PENDING') {
      throw new InvalidMediaTransitionError(this.props.status, 'READY');
    }
    this.props.status = 'READY';
    this.props.updatedAt = new Date();
  }

  public markFailed(): void {
    if (this.props.status !== 'PENDING') {
      throw new InvalidMediaTransitionError(this.props.status, 'FAILED');
    }
    this.props.status = 'FAILED';
    this.props.updatedAt = new Date();
  }

  public toJSON(): MediaAssetProps {
    return { ...this.props };
  }
}

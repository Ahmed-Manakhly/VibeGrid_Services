import { InvalidMediaFileError } from '../errors/DomainError';

export type MediaPurpose = 'avatar' | 'post_attachment';

export class MediaFileConfig {
  private static readonly AVATAR_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly AVATAR_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  private static readonly POST_ATTACHMENT_ALLOWED_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/javascript',
    'application/typescript',
    'application/octet-stream'
  ];
  private static readonly POST_ATTACHMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

  public static validate(mimeType: string, fileSizeBytes: number, purpose: MediaPurpose): void {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new InvalidMediaFileError('MIME type must be a non-empty string');
    }

    if (fileSizeBytes <= 0) {
      throw new InvalidMediaFileError('File size must be greater than zero bytes');
    }

    const lowerMime = mimeType.toLowerCase();

    if (purpose === 'avatar') {
      if (!this.AVATAR_ALLOWED_MIMES.includes(lowerMime)) {
        throw new InvalidMediaFileError(
          `Unsupported image MIME type: '${mimeType}'. Allowed avatar types: ${this.AVATAR_ALLOWED_MIMES.join(', ')}`
        );
      }
      if (fileSizeBytes > this.AVATAR_MAX_SIZE_BYTES) {
        throw new InvalidMediaFileError(
          `Avatar file size (${fileSizeBytes} bytes) exceeds maximum allowed limit of 10MB`
        );
      }
    } else if (purpose === 'post_attachment') {
      if (!this.POST_ATTACHMENT_ALLOWED_MIMES.includes(lowerMime)) {
        throw new InvalidMediaFileError(
          `Unsupported attachment MIME type: '${mimeType}'. Allowed attachment types: ${this.POST_ATTACHMENT_ALLOWED_MIMES.join(', ')}`
        );
      }
      if (fileSizeBytes > this.POST_ATTACHMENT_MAX_SIZE_BYTES) {
        throw new InvalidMediaFileError(
          `Post attachment file size (${fileSizeBytes} bytes) exceeds maximum allowed limit of 100MB`
        );
      }
    }
  }
}

import { InvalidMediaFileError } from '../errors/DomainError';

export type MediaPurpose = 'avatar' | 'post_attachment';

export class MediaFileConfig {
  private static readonly AVATAR_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly AVATAR_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  public static validate(mimeType: string, fileSizeBytes: number, purpose: MediaPurpose): void {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new InvalidMediaFileError('MIME type must be a non-empty string');
    }

    if (fileSizeBytes <= 0) {
      throw new InvalidMediaFileError('File size must be greater than zero bytes');
    }

    if (purpose === 'avatar') {
      if (!this.AVATAR_ALLOWED_MIMES.includes(mimeType.toLowerCase())) {
        throw new InvalidMediaFileError(
          `Unsupported image MIME type: '${mimeType}'. Allowed avatar types: ${this.AVATAR_ALLOWED_MIMES.join(', ')}`
        );
      }
      if (fileSizeBytes > this.AVATAR_MAX_SIZE_BYTES) {
        throw new InvalidMediaFileError(
          `Avatar file size (${fileSizeBytes} bytes) exceeds maximum allowed limit of 10MB`
        );
      }
    }
  }
}

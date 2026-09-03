export interface PresignedUploadResult {
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface ObjectMetadata {
  contentLength: number;
  contentType: string;
}

export interface IStorageProvider {
  generatePresignedUploadUrl(objectKey: string, contentType: string, expiresInSeconds?: number): Promise<PresignedUploadResult>;
  verifyObjectMetadata(objectKey: string): Promise<ObjectMetadata | null>;
  getPublicReadUrl(objectKey: string): string;
}

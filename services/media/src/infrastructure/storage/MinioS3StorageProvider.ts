import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider } from '../../domain/ports/IStorageProvider';

export interface MinioS3Config {
  internalEndpoint: string;
  publicEndpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export class MinioS3StorageProvider implements IStorageProvider {
  private s3InternalClient: S3Client;
  private s3PublicClient: S3Client;

  constructor(private config: MinioS3Config) {
    this.s3InternalClient = new S3Client({
      endpoint: config.internalEndpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.s3PublicClient = new S3Client({
      endpoint: config.publicEndpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async generatePresignedUploadUrl(
    objectKey: string,
    mimeType: string,
    expiresInSeconds: number = 900
  ): Promise<{ uploadUrl: string; expiresInSeconds: number }> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3PublicClient, command, {
      expiresIn: expiresInSeconds,
    });

    return { uploadUrl, expiresInSeconds };
  }

  async verifyObjectMetadata(
    objectKey: string
  ): Promise<{ contentLength: number; contentType: string } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectKey,
      });

      const response = await this.s3InternalClient.send(command);
      if (!response || response.ContentLength === undefined) {
        return null;
      }

      return {
        contentLength: response.ContentLength,
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  getPublicReadUrl(objectKey: string): string {
    const baseUrl = this.config.publicEndpoint.endsWith('/')
      ? this.config.publicEndpoint.slice(0, -1)
      : this.config.publicEndpoint;
    return `${baseUrl}/${this.config.bucketName}/${objectKey}`;
  }
}

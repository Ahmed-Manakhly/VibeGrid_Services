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
  private s3Client: S3Client;

  constructor(private config: MinioS3Config) {
    this.s3Client = new S3Client({
      endpoint: config.internalEndpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });

    // Ensure Host header matches public endpoint hostname for MinIO bucket domain rules
    try {
      const publicHost = new URL(config.publicEndpoint).host;
      this.s3Client.middlewareStack.add(
        (next) => async (args: any) => {
          if (args.request && args.request.headers) {
            args.request.headers['host'] = publicHost;
          }
          return await next(args);
        },
        { step: 'build', priority: 'high', name: 'minioHostHeaderFix' }
      );
    } catch (e) {
      // ignore URL parsing error
    }
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

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    // Replace internal endpoint hostname with public endpoint if different
    const finalUploadUrl = uploadUrl.replace(this.config.internalEndpoint, this.config.publicEndpoint);

    return { uploadUrl: finalUploadUrl, expiresInSeconds };
  }

  async verifyObjectMetadata(
    objectKey: string
  ): Promise<{ contentLength: number; contentType: string } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);
      if (!response || response.ContentLength === undefined) {
        return null;
      }

      return {
        contentLength: response.ContentLength,
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (err: any) {
      console.error('[MinioS3StorageProvider Error] HeadObject full error:', {
        name: err.name,
        message: err.message,
        statusCode: err.$metadata?.httpStatusCode || err.statusCode,
        code: err.code
      });
      if (
        err.name === 'NotFound' ||
        err.name === 'NoSuchKey' ||
        err.$metadata?.httpStatusCode === 404 ||
        err.statusCode === 404
      ) {
        return null;
      }
      return null;
    }
  }

  getPublicReadUrl(objectKey: string): string {
    const baseUrl = this.config.publicEndpoint.endsWith('/')
      ? this.config.publicEndpoint.slice(0, -1)
      : this.config.publicEndpoint;
    return `${baseUrl}/${this.config.bucketName}/${objectKey}`;
  }
}

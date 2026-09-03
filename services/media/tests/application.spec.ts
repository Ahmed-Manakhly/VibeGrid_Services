import { CreateUploadIntentUseCase } from '../src/application/use-cases/CreateUploadIntentUseCase';
import { ConfirmUploadUseCase } from '../src/application/use-cases/ConfirmUploadUseCase';
import { GetMediaAssetUseCase } from '../src/application/use-cases/GetMediaAssetUseCase';
import { MediaAsset } from '../src/domain/entities/MediaAsset';
import { IMediaAssetRepository } from '../src/domain/ports/IMediaAssetRepository';
import { IStorageProvider } from '../src/domain/ports/IStorageProvider';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../src/application/errors/MediaApplicationError';

class InMemoryMediaRepo implements IMediaAssetRepository {
  public assets: Map<string, MediaAsset> = new Map();

  async save(asset: MediaAsset): Promise<void> {
    this.assets.set(asset.id, asset);
  }

  async findById(id: string): Promise<MediaAsset | null> {
    return this.assets.get(id) || null;
  }

  async update(asset: MediaAsset): Promise<void> {
    this.assets.set(asset.id, asset);
  }
}

class MockStorageProvider implements IStorageProvider {
  public mockMetadata: { contentLength: number; contentType: string } | null = null;
  public shouldPresignFail = false;

  async generatePresignedUploadUrl(objectKey: string, contentType: string, expiresInSeconds = 900) {
    if (this.shouldPresignFail) {
      throw new Error('Presign failed');
    }
    return {
      uploadUrl: `http://localhost:9000/vibegrid-media/${objectKey}?presigned=true`,
      expiresInSeconds,
    };
  }

  async verifyObjectMetadata(objectKey: string) {
    return this.mockMetadata;
  }

  getPublicReadUrl(objectKey: string): string {
    return `http://localhost:9000/vibegrid-media/${objectKey}`;
  }
}

describe('CreateUploadIntentUseCase', () => {
  let repo: InMemoryMediaRepo;
  let storage: MockStorageProvider;
  let useCase: CreateUploadIntentUseCase;

  beforeEach(() => {
    repo = new InMemoryMediaRepo();
    storage = new MockStorageProvider();
    useCase = new CreateUploadIntentUseCase(repo, storage);
  });

  it('should generate presigned upload URL and persist PENDING asset', async () => {
    const result = await useCase.execute({
      ownerId: 'usr_100',
      mimeType: 'image/png',
      fileSizeBytes: 2048,
      purpose: 'avatar',
    });

    expect(result.assetId).toMatch(/^ast_/);
    expect(result.uploadUrl).toContain(result.objectKey);
    expect(repo.assets.size).toBe(1);

    const saved = await repo.findById(result.assetId);
    expect(saved?.status).toBe('PENDING');
    expect(saved?.ownerId).toBe('usr_100');
  });

  it('should not persist asset if presigning fails', async () => {
    storage.shouldPresignFail = true;

    await expect(useCase.execute({
      ownerId: 'usr_100',
      mimeType: 'image/png',
      fileSizeBytes: 2048,
      purpose: 'avatar',
    })).rejects.toThrow('Presign failed');

    expect(repo.assets.size).toBe(0);
  });

  it('should throw ValidationError on invalid MIME type', async () => {
    await expect(useCase.execute({
      ownerId: 'usr_100',
      mimeType: 'application/exe',
      fileSizeBytes: 2048,
      purpose: 'avatar',
    })).rejects.toThrow(ValidationError);
  });
});

describe('ConfirmUploadUseCase', () => {
  let repo: InMemoryMediaRepo;
  let storage: MockStorageProvider;
  let useCase: ConfirmUploadUseCase;

  beforeEach(() => {
    repo = new InMemoryMediaRepo();
    storage = new MockStorageProvider();
    useCase = new ConfirmUploadUseCase(repo, storage);
  });

  it('should transition PENDING asset to READY when S3 metadata matches', async () => {
    const asset = new MediaAsset({
      id: 'ast_100',
      ownerId: 'usr_100',
      objectKey: 'media/usr_100/ast_100.png',
      mimeType: 'image/png',
      size: 2048,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(asset);

    storage.mockMetadata = { contentLength: 2048, contentType: 'image/png' };

    const result = await useCase.execute({ assetId: 'ast_100', ownerId: 'usr_100' });
    expect(result.status).toBe('READY');
    expect(result.publicUrl).toContain('ast_100.png');

    const updated = await repo.findById('ast_100');
    expect(updated?.status).toBe('READY');
  });

  it('should throw ForbiddenError if ownerId does not match', async () => {
    const asset = new MediaAsset({
      id: 'ast_100',
      ownerId: 'usr_100',
      objectKey: 'media/usr_100/ast_100.png',
      mimeType: 'image/png',
      size: 2048,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(asset);

    await expect(useCase.execute({ assetId: 'ast_100', ownerId: 'usr_ATTACKER' }))
      .rejects.toThrow(ForbiddenError);
  });

  it('should throw ValidationError if ContentLength mismatches', async () => {
    const asset = new MediaAsset({
      id: 'ast_100',
      ownerId: 'usr_100',
      objectKey: 'media/usr_100/ast_100.png',
      mimeType: 'image/png',
      size: 2048,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(asset);

    storage.mockMetadata = { contentLength: 9999, contentType: 'image/png' };

    await expect(useCase.execute({ assetId: 'ast_100', ownerId: 'usr_100' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if ContentType mismatches', async () => {
    const asset = new MediaAsset({
      id: 'ast_100',
      ownerId: 'usr_100',
      objectKey: 'media/usr_100/ast_100.png',
      mimeType: 'image/png',
      size: 2048,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save(asset);

    storage.mockMetadata = { contentLength: 2048, contentType: 'image/gif' };

    await expect(useCase.execute({ assetId: 'ast_100', ownerId: 'usr_100' }))
      .rejects.toThrow(ValidationError);
  });
});

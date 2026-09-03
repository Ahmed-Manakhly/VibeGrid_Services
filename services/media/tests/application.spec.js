"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CreateUploadIntentUseCase_1 = require("../src/application/use-cases/CreateUploadIntentUseCase");
const ConfirmUploadUseCase_1 = require("../src/application/use-cases/ConfirmUploadUseCase");
const MediaAsset_1 = require("../src/domain/entities/MediaAsset");
const MediaApplicationError_1 = require("../src/application/errors/MediaApplicationError");
class InMemoryMediaRepo {
    assets = new Map();
    async save(asset) {
        this.assets.set(asset.id, asset);
    }
    async findById(id) {
        return this.assets.get(id) || null;
    }
    async update(asset) {
        this.assets.set(asset.id, asset);
    }
}
class MockStorageProvider {
    mockMetadata = null;
    shouldPresignFail = false;
    async generatePresignedUploadUrl(objectKey, contentType, expiresInSeconds = 900) {
        if (this.shouldPresignFail) {
            throw new Error('Presign failed');
        }
        return {
            uploadUrl: `http://localhost:9000/vibegrid-media/${objectKey}?presigned=true`,
            expiresInSeconds,
        };
    }
    async verifyObjectMetadata(objectKey) {
        return this.mockMetadata;
    }
    getPublicReadUrl(objectKey) {
        return `http://localhost:9000/vibegrid-media/${objectKey}`;
    }
}
describe('CreateUploadIntentUseCase', () => {
    let repo;
    let storage;
    let useCase;
    beforeEach(() => {
        repo = new InMemoryMediaRepo();
        storage = new MockStorageProvider();
        useCase = new CreateUploadIntentUseCase_1.CreateUploadIntentUseCase(repo, storage);
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
        })).rejects.toThrow(MediaApplicationError_1.ValidationError);
    });
});
describe('ConfirmUploadUseCase', () => {
    let repo;
    let storage;
    let useCase;
    beforeEach(() => {
        repo = new InMemoryMediaRepo();
        storage = new MockStorageProvider();
        useCase = new ConfirmUploadUseCase_1.ConfirmUploadUseCase(repo, storage);
    });
    it('should transition PENDING asset to READY when S3 metadata matches', async () => {
        const asset = new MediaAsset_1.MediaAsset({
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
        const asset = new MediaAsset_1.MediaAsset({
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
            .rejects.toThrow(MediaApplicationError_1.ForbiddenError);
    });
    it('should throw ValidationError if ContentLength mismatches', async () => {
        const asset = new MediaAsset_1.MediaAsset({
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
            .rejects.toThrow(MediaApplicationError_1.ValidationError);
    });
    it('should throw ValidationError if ContentType mismatches', async () => {
        const asset = new MediaAsset_1.MediaAsset({
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
            .rejects.toThrow(MediaApplicationError_1.ValidationError);
    });
});

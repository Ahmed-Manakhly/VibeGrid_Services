import { MediaAsset } from '../src/domain/entities/MediaAsset';
import { MediaFileConfig } from '../src/domain/value-objects/MediaFileConfig';
import { InvalidMediaFileError, InvalidMediaTransitionError } from '../src/domain/errors/DomainError';

describe('MediaAsset Domain Entity', () => {
  it('should create a valid MediaAsset in PENDING status', () => {
    const asset = new MediaAsset({
      id: 'ast_123',
      ownerId: 'usr_456',
      objectKey: 'media/usr_456/ast_123.png',
      mimeType: 'image/png',
      size: 1024,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(asset.id).toBe('ast_123');
    expect(asset.ownerId).toBe('usr_456');
    expect(asset.status).toBe('PENDING');
  });

  it('should transition status from PENDING to READY', () => {
    const asset = new MediaAsset({
      id: 'ast_123',
      ownerId: 'usr_456',
      objectKey: 'media/usr_456/ast_123.png',
      mimeType: 'image/png',
      size: 1024,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    asset.markReady();
    expect(asset.status).toBe('READY');
  });

  it('should reject invalid transition from READY to READY or FAILED', () => {
    const asset = new MediaAsset({
      id: 'ast_123',
      ownerId: 'usr_456',
      objectKey: 'media/usr_456/ast_123.png',
      mimeType: 'image/png',
      size: 1024,
      purpose: 'avatar',
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() => asset.markReady()).toThrow(InvalidMediaTransitionError);
    expect(() => asset.markFailed()).toThrow(InvalidMediaTransitionError);
  });

  it('should throw InvalidMediaFileError when required fields are missing', () => {
    expect(() => new MediaAsset({
      id: '',
      ownerId: 'usr_456',
      objectKey: 'media/usr_456/ast_123.png',
      mimeType: 'image/png',
      size: 1024,
      purpose: 'avatar',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })).toThrow(InvalidMediaFileError);
  });
});

describe('MediaFileConfig Value Object', () => {
  it('should accept valid avatar MIME types and sizes', () => {
    expect(() => MediaFileConfig.validate('image/png', 5 * 1024 * 1024, 'avatar')).not.toThrow();
    expect(() => MediaFileConfig.validate('image/jpeg', 10 * 1024 * 1024, 'avatar')).not.toThrow();
    expect(() => MediaFileConfig.validate('image/webp', 100, 'avatar')).not.toThrow();
  });

  it('should reject unsupported MIME types', () => {
    expect(() => MediaFileConfig.validate('application/pdf', 1024, 'avatar')).toThrow(InvalidMediaFileError);
    expect(() => MediaFileConfig.validate('video/mp4', 1024, 'avatar')).toThrow(InvalidMediaFileError);
  });

  it('should reject zero or negative file sizes', () => {
    expect(() => MediaFileConfig.validate('image/png', 0, 'avatar')).toThrow(InvalidMediaFileError);
    expect(() => MediaFileConfig.validate('image/png', -500, 'avatar')).toThrow(InvalidMediaFileError);
  });

  it('should reject avatar file sizes > 10MB', () => {
    const elevenMb = 11 * 1024 * 1024;
    expect(() => MediaFileConfig.validate('image/png', elevenMb, 'avatar')).toThrow(InvalidMediaFileError);
  });
});

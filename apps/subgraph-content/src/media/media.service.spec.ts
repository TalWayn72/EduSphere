/**
 * Unit tests for MediaService.
 *
 * Covers:
 *  1. getPresignedUploadUrl() generates a URL with the correct fileKey structure.
 *  2. getPresignedUploadUrl() throws InternalServerErrorException when S3Client fails.
 *  3. confirmUpload() inserts a DB row and returns a MediaAssetResult with status READY.
 *  4. confirmUpload() publishes to NATS via EDUSPHERE.media.uploaded.
 *  5. getPresignedDownloadUrl() returns a signed URL from S3Client.
 *  6. updateAltText() updates the DB row and returns the updated alt text.
 *  7. updateAltText() throws NotFoundException when the asset does not exist.
 *  8. getHlsManifestUrl() returns null when hlsManifestKey is null.
 *  9. onModuleDestroy() calls closeAllPools().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';

const mockS3Send = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientCtor() { return { send: mockS3Send }; }),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommandCtor(params: unknown) { return { type: 'PutObject', params }; }),
  GetObjectCommand: vi.fn().mockImplementation(function GetObjectCommandCtor(params: unknown) { return { type: 'GetObject', params }; }),
}));

const mockGetSignedUrl = vi.fn().mockResolvedValue('https://minio.example.com/bucket/key?sig=abc');

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

const mockNatsPublish = vi.fn();
const mockNatsFlush = vi.fn().mockResolvedValue(undefined);
const mockNatsClose = vi.fn().mockResolvedValue(undefined);
const mockNatsConnect = vi.fn().mockResolvedValue({
  publish: mockNatsPublish,
  flush: mockNatsFlush,
  close: mockNatsClose,
});

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => mockNatsConnect(...args),
  StringCodec: vi.fn().mockImplementation(function StringCodecCtor() {
    return { encode: (s: string) => Buffer.from(s) };
  }),
}));

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

const ASSET_ROW = {
  id: 'asset-1',
  course_id: 'course-1',
  file_url: 'tenant-1/course-1/uuid-video.mp4',
  title: 'Lecture 1',
  alt_text: null,
};

const mockInsertReturning = vi.fn().mockResolvedValue([ASSET_ROW]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockUpdateReturning = vi.fn().mockResolvedValue([{ ...ASSET_ROW, alt_text: 'A cat' }]);
const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

const mockDb = {
  insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
  update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  schema: {
    media_assets: { id: 'id', file_url: 'file_url', alt_text: 'alt_text' },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
}));

describe('MediaService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue('https://minio.example.com/bucket/key?sig=abc');
    mockInsertReturning.mockResolvedValue([ASSET_ROW]);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockUpdateReturning.mockResolvedValue([{ ...ASSET_ROW, alt_text: 'A cat' }]);
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockNatsConnect.mockResolvedValue({ publish: mockNatsPublish, flush: mockNatsFlush, close: mockNatsClose });
    process.env['MINIO_ENDPOINT'] = 'http://localhost:9000';
    process.env['MINIO_BUCKET'] = 'edusphere-media';
    process.env['NATS_URL'] = 'nats://localhost:4222';
    service = new MediaService();
  });

  it('should generate a presigned upload URL with correct fileKey structure', async () => {
    const result = await service.getPresignedUploadUrl('lecture.mp4', 'video/mp4', 'course-1', 'tenant-1');
    expect(result.uploadUrl).toContain('minio.example.com');
    expect(result.fileKey).toMatch(/^tenant-1\/course-1\/.+-lecture\.mp4$/);
    expect(result.expiresAt).toBeTruthy();
  });

  it('should throw InternalServerErrorException when getSignedUrl fails for upload', async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 unavailable'));
    await expect(service.getPresignedUploadUrl('file.mp4', 'video/mp4', 'c-1', 't-1')).rejects.toThrow(InternalServerErrorException);
  });

  it('should insert a DB record and return READY status on confirmUpload()', async () => {
    const result = await service.confirmUpload('tenant-1/course-1/uuid-video.mp4', 'course-1', 'Lecture 1', 'tenant-1', 'user-1');
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('READY');
    expect(result.id).toBe('asset-1');
    expect(result.fileKey).toBe('tenant-1/course-1/uuid-video.mp4');
  });

  it('should publish EDUSPHERE.media.uploaded to NATS after confirming upload', async () => {
    await service.confirmUpload('tenant-1/course-1/uuid-video.mp4', 'course-1', 'Lecture 1', 'tenant-1', 'user-1');
    expect(mockNatsConnect).toHaveBeenCalledTimes(1);
    expect(mockNatsPublish).toHaveBeenCalledWith('EDUSPHERE.media.uploaded', expect.any(Buffer));
  });

  it('should return a signed download URL from getPresignedDownloadUrl()', async () => {
    const url = await service.getPresignedDownloadUrl('tenant-1/course-1/file.mp4');
    expect(url).toContain('minio.example.com');
  });

  it('should update alt text in DB and return updated altText via updateAltText()', async () => {
    const result = await service.updateAltText('asset-1', 'A cat', 'tenant-1');
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(result.altText).toBe('A cat');
  });

  it('should throw NotFoundException when asset not found in updateAltText()', async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);
    await expect(service.updateAltText('missing-asset', 'Alt', 'tenant-1')).rejects.toThrow(NotFoundException);
  });

  it('should return null from getHlsManifestUrl() when hlsManifestKey is null', async () => {
    const result = await service.getHlsManifestUrl(null);
    expect(result).toBeNull();
  });

  it('should call closeAllPools on onModuleDestroy()', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });
});

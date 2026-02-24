import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';

const {
  mockSend,
  mockGetSignedUrl,
  mockNatsPublish,
  mockNatsFlush,
  mockNatsClose,
  mockReturning,
  mockInsertValues,
  mockDbInsert,
  mockDb,
} = vi.hoisted(() => {
  const mockSend = vi.fn();
  const mockGetSignedUrl = vi.fn().mockResolvedValue('https://minio.example.com/signed');
  const mockNatsPublish = vi.fn();
  const mockNatsFlush = vi.fn().mockResolvedValue(undefined);
  const mockNatsClose = vi.fn().mockResolvedValue(undefined);
  const mockReturning = vi.fn().mockResolvedValue([{ id: 'asset-1', course_id: 'course-1' }]);
  const mockInsertValues = vi.fn(() => ({ returning: mockReturning }));
  const mockDbInsert = vi.fn(() => ({ values: mockInsertValues }));
  const mockDb = { insert: mockDbInsert };
  return {
    mockSend,
    mockGetSignedUrl,
    mockNatsPublish,
    mockNatsFlush,
    mockNatsClose,
    mockReturning,
    mockInsertValues,
    mockDbInsert,
    mockDb,
  };
});


vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function() { (this as Record<string,unknown>).send = mockSend; }),
  PutObjectCommand: vi.fn().mockImplementation(function(p: Record<string,unknown>) { Object.assign(this as object, { type: 'PUT', ...p }); }),
  GetObjectCommand: vi.fn().mockImplementation(function(p: Record<string,unknown>) { Object.assign(this as object, { type: 'GET', ...p }); }),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: mockGetSignedUrl }));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ publish: mockNatsPublish, flush: mockNatsFlush, close: mockNatsClose }),
  StringCodec: vi.fn().mockReturnValue({ encode: vi.fn((v) => v) }),
}));


vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: { media_assets: {} },
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: { endpoint: 'minio.internal', port: 9000, useSSL: false, region: 'us-east-1', accessKey: 'admin', secretKey: 'admin', bucket: 'edusphere-media' },
}));

import { MediaService } from './media.service.js';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue('https://minio.example.com/signed');
    mockReturning.mockResolvedValue([{ id: 'asset-1', course_id: 'course-1' }]);
    service = new MediaService();
  });

  // getPresignedUploadUrl

  describe('getPresignedUploadUrl()', () => {
    it('returns uploadUrl, fileKey, and expiresAt', async () => {
      const result = await service.getPresignedUploadUrl('lec.mp4', 'video/mp4', 'course-1', 'tenant-1');
      expect(result.uploadUrl).toBe('https://minio.example.com/signed');
      expect(result.fileKey).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('includes tenantId and courseId in storage key path', async () => {
      const result = await service.getPresignedUploadUrl('lec.mp4', 'video/mp4', 'course-abc', 'tenant-xyz');
      expect(result.fileKey).toContain('tenant-xyz');
      expect(result.fileKey).toContain('course-abc');
    });

    it('uses bucket name from config (edusphere-media) not hardcoded', async () => {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      await service.getPresignedUploadUrl('f.pdf', 'application/pdf', 'c1', 't1');
      const callArg = vi.mocked(PutObjectCommand).mock.calls[0][0];
      expect(callArg.Bucket).toBe('edusphere-media');
    });

    it('sanitizes filename: replaces spaces and special chars', async () => {
      const result = await service.getPresignedUploadUrl('my file (2).mp4', 'video/mp4', 'c1', 't1');
      expect(result.fileKey).not.toContain(' ');
    });

    it('throws InternalServerErrorException when getSignedUrl rejects', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 down'));
      await expect(
        service.getPresignedUploadUrl('f.mp4', 'video/mp4', 'c1', 't1'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('sets expiresAt 15 minutes ahead of current time', async () => {
      const before = Date.now();
      const result = await service.getPresignedUploadUrl('f.mp4', 'video/mp4', 'c1', 't1');
      const after = Date.now();
      const expiresMs = new Date(result.expiresAt).getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 900000);
      expect(expiresMs).toBeLessThanOrEqual(after + 900000);
    });
  });

  describe('getPresignedDownloadUrl()', () => {
    it('returns a presigned download URL string', async () => {
      const url = await service.getPresignedDownloadUrl('t1/c1/file.mp4');
      expect(typeof url).toBe('string');
      expect(url).toBe('https://minio.example.com/signed');
    });

    it('passes the correct fileKey to GetObjectCommand', async () => {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      await service.getPresignedDownloadUrl('t1/c1/file.pdf');
      const callArg = vi.mocked(GetObjectCommand).mock.calls[0][0];
      expect(callArg.Key).toBe('t1/c1/file.pdf');
    });

    it('throws InternalServerErrorException when presigning fails', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.getPresignedDownloadUrl('key.mp4')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getHlsManifestUrl()', () => {
    it('returns null when hlsManifestKey is null', async () => {
      expect(await service.getHlsManifestUrl(null)).toBeNull();
    });

    it('returns a presigned URL for a valid hlsManifestKey', async () => {
      const result = await service.getHlsManifestUrl('t1/c1/hls/master.m3u8');
      expect(result).toBe('https://minio.example.com/signed');
    });

    it('returns null not throws when presigning fails for HLS key', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 error'));
      expect(await service.getHlsManifestUrl('bad/master.m3u8')).toBeNull();
    });
  });

  describe('confirmUpload()', () => {
    it('inserts media_assets with correct tenant_id', async () => {
      await service.confirmUpload('t1/c1/file.mp4', 'c1', 'Lecture', 'tenant-1', 'user-1');
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const [arg] = mockInsertValues.mock.calls[0] as [Record<string, unknown>];
      expect(arg.tenant_id).toBe('tenant-1');
    });

    it('returns result with id, courseId, fileKey, title and READY status', async () => {
      const r = await service.confirmUpload('t1/c1/f.mp4', 'course-1', 'Lecture 1', 'tenant-1', 'user-1');
      expect(r.id).toBe('asset-1');
      expect(r.courseId).toBe('course-1');
      expect(r.fileKey).toBe('t1/c1/f.mp4');
      expect(r.title).toBe('Lecture 1');
      expect(r.status).toBe('READY');
    });

    it('detects VIDEO for .mp4 files', async () => {
      await service.confirmUpload('t1/c1/v.mp4', 'c1', 'V', 't1', 'u1');
      const [arg] = mockInsertValues.mock.calls[0] as [Record<string, unknown>];
      expect(arg.media_type).toBe('VIDEO');
    });

    it('detects DOCUMENT for .pdf files', async () => {
      await service.confirmUpload('t1/c1/d.pdf', 'c1', 'D', 't1', 'u1');
      const [arg] = mockInsertValues.mock.calls[0] as [Record<string, unknown>];
      expect(arg.media_type).toBe('DOCUMENT');
    });

    it('detects AUDIO for .mp3 files', async () => {
      await service.confirmUpload('t1/c1/a.mp3', 'c1', 'A', 't1', 'u1');
      const [arg] = mockInsertValues.mock.calls[0] as [Record<string, unknown>];
      expect(arg.media_type).toBe('AUDIO');
    });

    it('sets hlsManifestUrl to null at upload time', async () => {
      const r = await service.confirmUpload('t1/c1/f.mp4', 'c1', 'L', 't1', 'u1');
      expect(r.hlsManifestUrl).toBeNull();
    });
  });

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools to release DB connections', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalledTimes(1);
    });
  });
});
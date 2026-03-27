/**
 * minio-url.spec.ts
 *
 * Unit tests for MinioUrlService — S3/MinIO presigned URL generation.
 * Tests: getPresignedUrl, uploadFile, onModuleDestroy (memory safety),
 *        edge cases (missing file key, custom expiry).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockSend, mockDestroy, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
  mockDestroy: vi.fn(),
  mockGetSignedUrl: vi
    .fn()
    .mockResolvedValue('https://minio.local/presigned-url'),
}));

vi.mock('@aws-sdk/client-s3', () => {
  class MockGetObjectCommand {
    _type = 'GetObjectCommand';
    [key: string]: unknown;
    constructor(args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  }
  class MockPutObjectCommand {
    _type = 'PutObjectCommand';
    [key: string]: unknown;
    constructor(args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  }
  return {
    S3Client: class {
      send = mockSend;
      destroy = mockDestroy;
    },
    GetObjectCommand: MockGetObjectCommand,
    PutObjectCommand: MockPutObjectCommand,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    endpoint: 'localhost',
    port: 9000,
    region: 'us-east-1',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    bucket: 'edusphere',
  },
}));

import { MinioUrlService } from '../minio-url.service.js';

describe('MinioUrlService', () => {
  let service: MinioUrlService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MinioUrlService();
  });

  describe('getPresignedUrl()', () => {
    it('returns a presigned URL for a given file key', async () => {
      const url = await service.getPresignedUrl('tenant-1/course-1/file.pdf');
      expect(url).toBe('https://minio.local/presigned-url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: 'edusphere',
          Key: 'tenant-1/course-1/file.pdf',
        }),
        { expiresIn: 900 },
      );
    });

    it('uses custom expiry when provided', async () => {
      await service.getPresignedUrl('key.pdf', 3600);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    it('uses default 900s expiry when none provided', async () => {
      await service.getPresignedUrl('doc.pdf');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 },
      );
    });

    it('handles empty file key', async () => {
      const url = await service.getPresignedUrl('');
      expect(url).toBe('https://minio.local/presigned-url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ Key: '' }),
        expect.anything(),
      );
    });

    it('propagates S3 errors', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 error'));
      await expect(
        service.getPresignedUrl('bad-key'),
      ).rejects.toThrow('S3 error');
    });
  });

  describe('uploadFile()', () => {
    it('sends PutObjectCommand to S3', async () => {
      const buffer = Buffer.from('pdf-content');
      await service.uploadFile('key.pdf', buffer, 'application/pdf');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'edusphere',
          Key: 'key.pdf',
          Body: buffer,
          ContentType: 'application/pdf',
          ContentLength: buffer.length,
        }),
      );
    });

    it('handles empty buffer', async () => {
      const buffer = Buffer.alloc(0);
      await service.uploadFile('empty.txt', buffer, 'text/plain');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'empty.txt',
          ContentLength: 0,
        }),
      );
    });

    it('propagates upload errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Upload failed'));
      await expect(
        service.uploadFile('key.pdf', Buffer.from('x'), 'application/pdf'),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('onModuleDestroy()', () => {
    it('destroys the S3 client (memory safety)', async () => {
      await service.onModuleDestroy();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('is idempotent — calling twice does not throw', async () => {
      await service.onModuleDestroy();
      await service.onModuleDestroy();
      expect(mockDestroy).toHaveBeenCalledTimes(2);
    });
  });
});

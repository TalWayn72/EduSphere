/**
 * minio-url.service.spec.ts
 *
 * Unit tests for MinioUrlService.
 * Tests: getPresignedUrl, uploadFile, onModuleDestroy (memory safety).
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

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockSend;
    destroy = mockDestroy;
  },
  GetObjectCommand: class {
    constructor(public args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  },
  PutObjectCommand: class {
    constructor(public args: Record<string, unknown>) {
      Object.assign(this, args);
    }
  },
}));

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

import { MinioUrlService } from './minio-url.service.js';

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
        { expiresIn: 900 }
      );
    });

    it('uses custom expiry when provided', async () => {
      await service.getPresignedUrl('key.pdf', 3600);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 }
      );
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
        })
      );
    });
  });

  describe('onModuleDestroy()', () => {
    it('destroys the S3 client', async () => {
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

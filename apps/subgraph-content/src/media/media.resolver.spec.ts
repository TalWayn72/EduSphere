import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    bucket: 'test-bucket',
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    accessKey: 'test-key',
    secretKey: 'test-secret',
  },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({})),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi
    .fn()
    .mockResolvedValue({ close: vi.fn(), publish: vi.fn(), flush: vi.fn() }),
  StringCodec: vi.fn(() => ({ encode: (s: string) => s })),
}));

import { MediaResolver } from './media.resolver.js';
import type { MediaService } from './media.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockGetPresignedUploadUrl = vi.fn();
const mockConfirmUpload = vi.fn();
const mockUpdateAltText = vi.fn();
const mockGetHlsManifestUrl = vi.fn();

const mockService = {
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
  confirmUpload: mockConfirmUpload,
  updateAltText: mockUpdateAltText,
  getHlsManifestUrl: mockGetHlsManifestUrl,
} as unknown as MediaService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['INSTRUCTOR'],
};
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const PRESIGNED_RESULT = {
  uploadUrl: 'https://minio.example.com/upload',
  fileKey: 'tenant-1/course-1/uuid-file.mp4',
  expiresAt: '2026-03-01T12:00:00.000Z',
};

const MEDIA_ASSET = {
  id: 'asset-1',
  courseId: 'course-1',
  fileKey: 'tenant-1/course-1/uuid-file.mp4',
  title: 'Lecture Video',
  contentType: 'video/mp4',
  status: 'READY',
  downloadUrl: 'https://minio.example.com/download',
  hlsManifestUrl: null,
  captionsUrl: null,
  altText: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MediaResolver', () => {
  let resolver: MediaResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new MediaResolver(mockService);
  });

  // ── getPresignedUploadUrl ──────────────────────────────────────────────────

  describe('getPresignedUploadUrl()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.getPresignedUploadUrl(
          'file.mp4',
          'video/mp4',
          'course-1',
          noAuthCtx
        )
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(
        resolver.getPresignedUploadUrl('file.mp4', 'video/mp4', 'course-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it('delegates to service with correct args and returns result', async () => {
      mockGetPresignedUploadUrl.mockResolvedValueOnce(PRESIGNED_RESULT);

      const result = await resolver.getPresignedUploadUrl(
        'lecture.mp4',
        'video/mp4',
        'course-1',
        makeCtx()
      );

      expect(result).toEqual(PRESIGNED_RESULT);
      expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
        'lecture.mp4',
        'video/mp4',
        'course-1',
        'tenant-1'
      );
    });

    it('passes tenantId from auth context (not from args)', async () => {
      mockGetPresignedUploadUrl.mockResolvedValueOnce(PRESIGNED_RESULT);
      const ctx = makeCtx({ userId: 'u1', tenantId: 'tenant-xyz', roles: [] });

      await resolver.getPresignedUploadUrl(
        'f.pdf',
        'application/pdf',
        'c2',
        ctx
      );

      const [, , , tenantArg] = mockGetPresignedUploadUrl.mock.calls[0];
      expect(tenantArg).toBe('tenant-xyz');
    });
  });

  // ── confirmMediaUpload ────────────────────────────────────────────────────

  describe('confirmMediaUpload()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.confirmMediaUpload('key', 'course-1', 'Video', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockConfirmUpload).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(
        resolver.confirmMediaUpload('key', 'course-1', 'Video', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({
        userId: undefined as unknown as string,
        tenantId: 't1',
        roles: [],
      });
      await expect(
        resolver.confirmMediaUpload('key', 'course-1', 'Video', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.confirmUpload with all correct args', async () => {
      mockConfirmUpload.mockResolvedValueOnce(MEDIA_ASSET);

      const result = await resolver.confirmMediaUpload(
        'tenant-1/course-1/uuid-file.mp4',
        'course-1',
        'Lecture Video',
        makeCtx()
      );

      expect(result).toEqual(MEDIA_ASSET);
      expect(mockConfirmUpload).toHaveBeenCalledWith(
        'tenant-1/course-1/uuid-file.mp4',
        'course-1',
        'Lecture Video',
        'tenant-1',
        'user-1'
      );
    });
  });

  // ── resolveHlsManifestUrl ─────────────────────────────────────────────────

  describe('resolveHlsManifestUrl()', () => {
    it('returns parent.hlsManifestUrl directly when it is not undefined', async () => {
      const parent = {
        hlsManifestUrl: 'https://cdn.example.com/manifest.m3u8',
      };
      const result = await resolver.resolveHlsManifestUrl(parent);
      expect(result).toBe('https://cdn.example.com/manifest.m3u8');
      expect(mockGetHlsManifestUrl).not.toHaveBeenCalled();
    });

    it('returns null directly when parent.hlsManifestUrl is null', async () => {
      const parent = { hlsManifestUrl: null };
      const result = await resolver.resolveHlsManifestUrl(parent);
      expect(result).toBeNull();
      expect(mockGetHlsManifestUrl).not.toHaveBeenCalled();
    });

    it('calls service.getHlsManifestUrl with hlsManifestKey when hlsManifestUrl is undefined', async () => {
      mockGetHlsManifestUrl.mockResolvedValueOnce(
        'https://cdn.example.com/hls/master.m3u8'
      );
      const parent = {
        hlsManifestUrl: undefined as unknown as null,
        hlsManifestKey: 'hls/manifest.m3u8',
      };
      const result = await resolver.resolveHlsManifestUrl(parent);
      expect(mockGetHlsManifestUrl).toHaveBeenCalledWith('hls/manifest.m3u8');
      expect(result).toBe('https://cdn.example.com/hls/master.m3u8');
    });
  });
});

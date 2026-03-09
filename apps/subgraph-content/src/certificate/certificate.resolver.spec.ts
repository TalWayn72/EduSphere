import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@edusphere/config', () => ({
  minioConfig: {
    endpoint: 'localhost',
    port: 9000,
    useSSL: false,
    bucket: 'test',
    region: 'us-east-1',
    accessKey: 'k',
    secretKey: 's',
  },
}));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn(), destroy: vi.fn() })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio.example.com/bucket/cert.pdf?signed=1'),
}));
vi.mock('@edusphere/auth', () => ({}));

import { CertificateResolver } from './certificate.resolver.js';
import type { CertificateService } from './certificate.service.js';
import { CertificateDownloadService } from './certificate-download.service.js';

// ── Mock services ──────────────────────────────────────────────────────────────

const mockGetMyCertificates = vi.fn();
const mockVerifyCertificate = vi.fn();
const mockGetCertificateDownloadUrl = vi.fn();

const mockCertificateService = {
  getMyCertificates: mockGetMyCertificates,
  verifyCertificate: mockVerifyCertificate,
} as unknown as CertificateService;

const mockCertificateDownloadService = {
  getCertificateDownloadUrl: mockGetCertificateDownloadUrl,
} as unknown as CertificateDownloadService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeCtx = (roles: string[] = ['STUDENT']) => ({
  authContext: { userId: 'u1', tenantId: 't1', roles },
});

const noAuthCtx = { authContext: undefined };

const CERT = {
  id: 'cert-1',
  userId: 'u1',
  courseId: 'course-1',
  courseTitle: 'Introduction to AI',
  issuedAt: '2026-01-20T12:00:00.000Z',
  verificationCode: 'VERIFY-ABC123',
  pdfUrl: 'https://minio.example.com/cert-1.pdf',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CertificateResolver', () => {
  let resolver: CertificateResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new CertificateResolver(mockCertificateService, mockCertificateDownloadService);
  });

  // ── getMyCertificates ─────────────────────────────────────────────────────────

  describe('getMyCertificates', () => {
    it('returns certificates for authenticated user', async () => {
      mockGetMyCertificates.mockResolvedValueOnce([CERT]);

      const result = await resolver.getMyCertificates(makeCtx());

      expect(result).toEqual([CERT]);
      expect(mockGetMyCertificates).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', userId: 'u1' })
      );
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(resolver.getMyCertificates(noAuthCtx)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockGetMyCertificates).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = {
        authContext: {
          userId: 'u1',
          tenantId: undefined as unknown as string,
          roles: ['STUDENT'],
        },
      };
      await expect(resolver.getMyCertificates(ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('passes correct TenantContext with first role as userRole', async () => {
      mockGetMyCertificates.mockResolvedValueOnce([]);
      const ctx = makeCtx(['INSTRUCTOR']);

      await resolver.getMyCertificates(ctx);

      expect(mockGetMyCertificates).toHaveBeenCalledWith(
        expect.objectContaining({ userRole: 'INSTRUCTOR' })
      );
    });

    it('defaults userRole to STUDENT when roles array is empty', async () => {
      mockGetMyCertificates.mockResolvedValueOnce([]);
      const ctx = { authContext: { userId: 'u1', tenantId: 't1', roles: [] } };

      await resolver.getMyCertificates(ctx);

      expect(mockGetMyCertificates).toHaveBeenCalledWith(
        expect.objectContaining({ userRole: 'STUDENT' })
      );
    });
  });

  // ── verifyCertificate ─────────────────────────────────────────────────────────

  describe('verifyCertificate', () => {
    it('returns verification result without requiring auth', async () => {
      const verifyResult = { valid: true, certificate: CERT };
      mockVerifyCertificate.mockResolvedValueOnce(verifyResult);

      const result = await resolver.verifyCertificate('VERIFY-ABC123');

      expect(result).toEqual(verifyResult);
      expect(mockVerifyCertificate).toHaveBeenCalledWith('VERIFY-ABC123');
    });

    it('returns null for unknown verification code', async () => {
      mockVerifyCertificate.mockResolvedValueOnce(null);

      const result = await resolver.verifyCertificate('UNKNOWN-CODE');

      expect(result).toBeNull();
    });
  });

  // ── certificateDownloadUrl ────────────────────────────────────────────────────

  describe('certificateDownloadUrl', () => {
    it('delegates to CertificateDownloadService using JWT userId (not a client-supplied arg)', async () => {
      const presignedUrl = 'https://minio.example.com/bucket/cert.pdf?signed=1';
      mockGetCertificateDownloadUrl.mockResolvedValueOnce(presignedUrl);

      const ctx = makeCtx(['STUDENT']);
      const result = await resolver.getCertificateDownloadUrl(ctx, 'cert-1');

      expect(result).toBe(presignedUrl);
      // Must use userId from JWT context (ctx.authContext.userId = 'u1'), not a client arg
      expect(mockGetCertificateDownloadUrl).toHaveBeenCalledWith('cert-1', 'u1', 't1');
    });

    it('throws UnauthorizedException when no auth context is present', async () => {
      await expect(
        resolver.getCertificateDownloadUrl(noAuthCtx, 'cert-1')
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetCertificateDownloadUrl).not.toHaveBeenCalled();
    });
  });
});

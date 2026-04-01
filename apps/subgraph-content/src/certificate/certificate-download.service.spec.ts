import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CertificateDownloadService } from './certificate-download.service';

const mockTx = { select: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    certificates: {
      id: 'id',
      user_id: 'user_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    bucket: 'test-bucket',
    endpoint: 'localhost',
    port: 9000,
    region: 'us-east-1',
    accessKey: 'testkey',
    secretKey: 'testsecret',
  },
}));

const mockGetSignedUrl = vi.fn();
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

vi.mock('@aws-sdk/client-s3', () => {
  const destroy = vi.fn();
  return {
    S3Client: class {
      destroy = destroy;
    },
    GetObjectCommand: class {
      constructor(public input: unknown) {}
    },
    __mockDestroy: destroy,
  };
});

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

describe('CertificateDownloadService', () => {
  let service: CertificateDownloadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CertificateDownloadService();
  });

  describe('onModuleDestroy()', () => {
    it('destroys S3 client', async () => {
      await service.onModuleDestroy();
      // S3 client destroy is called on module destroy
      const { __mockDestroy } = (await import('@aws-sdk/client-s3')) as {
        __mockDestroy: ReturnType<typeof vi.fn>;
      };
      expect(__mockDestroy).toHaveBeenCalled();
    });
  });

  describe('getCertificateDownloadUrl()', () => {
    it('returns presigned URL for a valid certificate', async () => {
      const chain = makeSelectChain([
        { id: 'cert-1', user_id: 'u1', pdf_url: 'certs/cert-1.pdf' },
      ]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });
      mockGetSignedUrl.mockResolvedValueOnce('https://minio/signed-url');

      const url = await service.getCertificateDownloadUrl('cert-1', 'u1', 't1');

      expect(url).toBe('https://minio/signed-url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 900 })
      );
    });

    it('throws NotFoundException when certificate not found', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      await expect(
        service.getCertificateDownloadUrl('missing', 'u1', 't1')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when pdf_url is null', async () => {
      const chain = makeSelectChain([
        { id: 'cert-1', user_id: 'u1', pdf_url: null },
      ]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      await expect(
        service.getCertificateDownloadUrl('cert-1', 'u1', 't1')
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when pdf_url is empty string', async () => {
      const chain = makeSelectChain([
        { id: 'cert-1', user_id: 'u1', pdf_url: '' },
      ]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      await expect(
        service.getCertificateDownloadUrl('cert-1', 'u1', 't1')
      ).rejects.toThrow(BadRequestException);
    });
  });
});

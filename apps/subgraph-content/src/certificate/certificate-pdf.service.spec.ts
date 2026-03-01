import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    endpoint: 'localhost',
    port: 9000,
    useSSL: false,
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKey: 'k',
    secretKey: 's',
  },
}));

const mockSend = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () {
    return { send: mockSend };
  }),
  PutObjectCommand: vi.fn(function (args: unknown) {
    return args;
  }),
}));

// PDFKit mock that immediately fires data + end events
vi.mock('pdfkit', () => ({
  default: vi.fn(function () {
    const handlers: Record<string, Array<(d: Buffer) => void>> = {};
    const doc = {
      on: (ev: string, cb: (d: Buffer) => void) => {
        (handlers[ev] ??= []).push(cb);
      },
      end: () => {
        handlers['data']?.forEach((cb) => cb(Buffer.from('PDF-CONTENT')));
        handlers['end']?.forEach((cb) => cb(Buffer.from('')));
      },
      fontSize: function () { return doc; },
      font: function () { return doc; },
      text: function () { return doc; },
      moveDown: function () { return doc; },
      fillColor: function () { return doc; },
      rect: function () { return doc; },
      fill: function () { return doc; },
      image: function () { return doc; },
    };
    return doc;
  }),
}));

import { CertificatePdfService } from './certificate-pdf.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  tenantId: 'tenant-1',
  userId: 'user-42',
  courseId: 'course-99',
  learnerName: 'Alice Cohen',
  courseName: 'Intro to Talmud',
  issuedAt: new Date('2026-01-15T00:00:00.000Z'),
  verificationCode: 'vc-abc-123',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CertificatePdfService', () => {
  let service: CertificatePdfService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    service = new CertificatePdfService();
  });

  // Test 1: service instantiates without error
  it('service instantiates without error', () => {
    expect(() => new CertificatePdfService()).not.toThrow();
  });

  // Test 2: generateAndUpload returns a string (fileKey)
  it('generateAndUpload — returns a fileKey string', async () => {
    const result = await service.generateAndUpload(BASE_INPUT);
    expect(typeof result).toBe('string');
  });

  // Test 3: fileKey contains tenantId and userId path segments
  it('generateAndUpload — fileKey contains tenantId and userId path segments', async () => {
    const result = await service.generateAndUpload(BASE_INPUT);
    expect(result).toContain('tenant-1');
    expect(result).toContain('user-42');
    expect(result).toContain('certificates');
  });

  // Test 4: fileKey ends with .pdf
  it('generateAndUpload — fileKey ends with .pdf', async () => {
    const result = await service.generateAndUpload(BASE_INPUT);
    expect(result).toMatch(/\.pdf$/);
  });

  // Test 5: S3 PutObjectCommand called with ContentType application/pdf
  it('generateAndUpload — calls S3 with ContentType application/pdf', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    await service.generateAndUpload(BASE_INPUT);

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ ContentType: 'application/pdf' })
    );
    expect(mockSend).toHaveBeenCalledOnce();
  });

  // Test 6: buildPdf (via generateAndUpload) resolves to a Buffer that is uploaded
  it('generateAndUpload — uploads a Buffer body to S3', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    await service.generateAndUpload(BASE_INPUT);

    const callArg = vi.mocked(PutObjectCommand).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Buffer.isBuffer(callArg?.['Body'])).toBe(true);
    expect((callArg?.['Body'] as Buffer).length).toBeGreaterThan(0);
  });
});

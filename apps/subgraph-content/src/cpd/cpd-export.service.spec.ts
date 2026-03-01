import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock references — declared before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
  mockGetSignedUrl: vi.fn().mockResolvedValue('https://minio/report.csv'),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: mockSend };
  }),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('pdfkit', () => {
  function MockPDFDocument() {
    const self = this as Record<string, unknown>;
    const handlers: Record<string, Array<(data: Buffer) => void>> = {};
    self['on'] = (event: string, cb: (data: Buffer) => void) => {
      (handlers[event] ??= []).push(cb);
      return self;
    };
    self['end'] = () => {
      handlers['data']?.forEach((cb) => cb(Buffer.from('PDF')));
      handlers['end']?.forEach((cb) => cb(Buffer.from('')));
    };
    self['fontSize'] = () => self;
    self['font'] = () => self;
    self['fillColor'] = () => self;
    self['text'] = () => self;
    self['moveDown'] = () => self;
    self['rect'] = () => self;
    self['fill'] = () => self;
    self['addPage'] = () => self;
    self['page'] = { margins: { left: 40 }, height: 842 };
    self['y'] = 100;
  }
  return { default: MockPDFDocument };
});

import { CpdExportService } from './cpd-export.service.js';
import type { CpdReport } from './cpd.types.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const REPORT: CpdReport = {
  totalHours: 5.5,
  byType: [{ name: 'CPE', regulatoryBody: 'NASBA', totalHours: 5.5 }],
  entries: [
    {
      id: 'e1',
      courseId: 'c1',
      creditTypeName: 'CPE',
      earnedHours: 5.5,
      completionDate: '2026-01-10T00:00:00.000Z',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CpdExportService', () => {
  let service: CpdExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue('https://minio/report.csv');
    mockSend.mockResolvedValue({});
    service = new CpdExportService();
  });

  // ── CSV sanitization — tested indirectly via generateReport ─────────────
  // sanitizeCsvCell is a module-level function; verified through CSV output
  // captured in the S3 upload call.

  it('generateReport CSV — PutObjectCommand receives a CSV buffer', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await service.generateReport(REPORT, 'u1', 't1', 'CSV');

    const [putArgs] = vi.mocked(PutObjectCommand).mock.calls;
    const body = (putArgs?.[0] as { Body?: Buffer })?.Body;
    expect(body).toBeInstanceOf(Buffer);
    // Verify CSV body is not empty
    expect(body?.length).toBeGreaterThan(0);
  });

  it('generateReport CSV — body contains quoted credit type name from entries', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await service.generateReport(REPORT, 'u1', 't1', 'CSV');

    const [putArgs] = vi.mocked(PutObjectCommand).mock.calls;
    const body = (putArgs?.[0] as { Body?: Buffer })?.Body;
    const csv = body?.toString('utf-8') ?? '';
    // CPE is wrapped in quotes by sanitizeCsvCell
    expect(csv).toContain('"CPE"');
  });

  it('generateReport CSV — header row contains required column names', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await service.generateReport(REPORT, 'u1', 't1', 'CSV');

    const [putArgs] = vi.mocked(PutObjectCommand).mock.calls;
    const body = (putArgs?.[0] as { Body?: Buffer })?.Body;
    const csv = body?.toString('utf-8') ?? '';
    expect(csv).toContain('Course ID');
    expect(csv).toContain('Credit Type');
    expect(csv).toContain('Earned Hours');
  });

  it('generateReport CSV — key includes tenantId and userId path segments', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await service.generateReport(REPORT, 'user-42', 'tenant-99', 'CSV');

    const [putArgs] = vi.mocked(PutObjectCommand).mock.calls;
    const key = (putArgs?.[0] as { Key?: string })?.Key ?? '';
    expect(key).toContain('tenant-99');
    expect(key).toContain('user-42');
    expect(key).toMatch(/\.csv$/);
  });

  // ── generateReport ────────────────────────────────────────────────────────

  it('generateReport CSV — uploads to S3 and returns signed URL', async () => {
    const url = await service.generateReport(REPORT, 'u1', 't1', 'CSV');

    expect(mockSend).toHaveBeenCalled();
    expect(mockGetSignedUrl).toHaveBeenCalled();
    expect(url).toBe('https://minio/report.csv');
  });

  it('generateReport NASBA — builds PDF, uploads and returns signed URL', async () => {
    mockGetSignedUrl.mockResolvedValue('https://minio/report.pdf');

    const url = await service.generateReport(REPORT, 'u1', 't1', 'NASBA');

    expect(mockSend).toHaveBeenCalled();
    expect(url).toBe('https://minio/report.pdf');
  });

  it('generateReport AMA — builds PDF, uploads and returns signed URL', async () => {
    mockGetSignedUrl.mockResolvedValue('https://minio/ama.pdf');

    const url = await service.generateReport(REPORT, 'u1', 't1', 'AMA');

    expect(mockSend).toHaveBeenCalled();
    expect(url).toBe('https://minio/ama.pdf');
  });

  it('service instantiates without error', () => {
    expect(() => new CpdExportService()).not.toThrow();
  });
});

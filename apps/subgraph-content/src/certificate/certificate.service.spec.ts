import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificateService } from './certificate.service';
import { CertificatePdfService } from './certificate-pdf.service';

// ── DB mock ──────────────────────────────────────────────────────────────────
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDb = { insert: mockInsert, select: mockSelect, update: mockUpdate };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    certificates: {
      id: 'id',
      user_id: 'user_id',
      course_id: 'course_id',
      tenant_id: 'tenant_id',
      verification_code: 'verification_code',
      pdf_url: 'pdf_url',
      issued_at: 'issued_at',
      metadata: 'metadata',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockDb)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: vi.fn(() => ({
        next: vi.fn().mockResolvedValue({ done: true }),
      })),
      unsubscribe: vi.fn(),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn(), decode: vi.fn() })),
}));

const NOW = new Date('2026-02-24T00:00:00.000Z');
const MOCK_CERT = {
  id: 'cert-1',
  user_id: 'user-1',
  course_id: 'course-1',
  tenant_id: 'tenant-1',
  verification_code: 'vc-uuid-1234',
  pdf_url: null,
  issued_at: NOW,
  created_at: NOW,
  updated_at: NOW,
  metadata: { courseName: 'Intro to Talmud', learnerName: 'Test User' },
};

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT' as const,
};

const EVENT = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  courseId: 'course-1',
  learnerName: 'Test User',
  courseName: 'Intro to Talmud',
};

describe('CertificateService', () => {
  let service: CertificateService;
  let pdfService: CertificatePdfService;

  beforeEach(() => {
    vi.clearAllMocks();
    pdfService = {
      generateAndUpload: vi
        .fn()
        .mockResolvedValue('tenant-1/certificates/user-1/cert.pdf'),
    } as unknown as CertificatePdfService;
    service = new CertificateService(pdfService);
  });

  describe('generateCertificate', () => {
    it('calls PDF service and inserts certificate into DB', async () => {
      // Mock insert to return stub cert
      const returning = vi.fn().mockResolvedValue([MOCK_CERT]);
      const values = vi.fn().mockReturnValue({ returning });
      mockInsert.mockReturnValue({ values });

      // Mock update chain
      const where = vi.fn().mockResolvedValue([]);
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });

      const result = await service.generateCertificate(EVENT);

      expect(pdfService.generateAndUpload).toHaveBeenCalledOnce();
      expect(pdfService.generateAndUpload).toHaveBeenCalledWith(
        expect.objectContaining({ verificationCode: 'vc-uuid-1234' })
      );
      expect(mockInsert).toHaveBeenCalledOnce();
      expect(mockUpdate).toHaveBeenCalledOnce();
      expect(result.id).toBe('cert-1');
      expect(result.verificationCode).toBe('vc-uuid-1234');
      expect(result.pdfUrl).toBe('tenant-1/certificates/user-1/cert.pdf');
    });
  });

  describe('getMyCertificates', () => {
    it('returns mapped certificate list for user', async () => {
      const where = vi.fn().mockResolvedValue([MOCK_CERT]);
      const from = vi.fn().mockReturnValue({ where });
      mockSelect.mockReturnValue({ from });

      const results = await service.getMyCertificates(TENANT_CTX);

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('cert-1');
      expect(results[0]?.courseName).toBe('Intro to Talmud');
    });
  });

  describe('verifyCertificate', () => {
    it('returns certificate when code matches', async () => {
      const limit = vi.fn().mockResolvedValue([MOCK_CERT]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      mockSelect.mockReturnValue({ from });

      const result = await service.verifyCertificate('vc-uuid-1234');
      expect(result).not.toBeNull();
      expect(result?.verificationCode).toBe('vc-uuid-1234');
    });

    it('returns null when code does not match', async () => {
      const limit = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      mockSelect.mockReturnValue({ from });

      const result = await service.verifyCertificate('nonexistent-code');
      expect(result).toBeNull();
    });
  });
});

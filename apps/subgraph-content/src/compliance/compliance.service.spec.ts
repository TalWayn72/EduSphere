import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

// ── Hoist mocks so they can be referenced in vi.mock factories ────────────────
const {
  MockS3Client,
  MockPutObjectCommand,
  MockGetObjectCommand,
  mockCloseAllPools,
  mockWithTenantContext,
  mockGetSignedUrl,
} = vi.hoisted(() => {
  const mockWithTenantContext = vi.fn();
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockGetSignedUrl = vi
    .fn()
    .mockResolvedValue('https://minio.example.com/report?X-Amz-Expires=3600');
  // Must be actual constructors (function, not arrow) for `new X()` to work
  const MockS3Client = vi.fn().mockImplementation(function (this: object) {
    (this as { send: ReturnType<typeof vi.fn> }).send = vi
      .fn()
      .mockResolvedValue({});
  });
  const MockPutObjectCommand = vi.fn().mockImplementation(function (
    this: object,
    args: unknown
  ) {
    Object.assign(this as object, args as object);
  });
  const MockGetObjectCommand = vi.fn().mockImplementation(function (
    this: object,
    args: unknown
  ) {
    Object.assign(this as object, args as object);
  });
  return {
    MockS3Client,
    MockPutObjectCommand,
    MockGetObjectCommand,
    mockCloseAllPools,
    mockWithTenantContext,
    mockGetSignedUrl,
  };
});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
  GetObjectCommand: MockGetObjectCommand,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: {
    courses: {
      id: 'id',
      tenant_id: 'tenant_id',
      title: 'title',
      slug: 'slug',
      is_compliance: 'is_compliance',
      compliance_due_date: 'compliance_due_date',
      is_published: 'is_published',
      estimated_hours: 'estimated_hours',
      deleted_at: 'deleted_at',
    },
    userCourses: {
      userId: 'userId',
      courseId: 'courseId',
      enrolledAt: 'enrolledAt',
      completedAt: 'completedAt',
    },
    users: {
      id: 'id',
      email: 'email',
      first_name: 'first_name',
      last_name: 'last_name',
    },
  },
  withTenantContext: mockWithTenantContext,
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

import { ComplianceService } from './compliance.service.js';
import { CompliancePdfService } from './compliance-pdf.service.js';

const ADMIN_CTX = {
  tenantId: 'tenant-1',
  userId: 'admin-1',
  userRole: 'ORG_ADMIN' as const,
};
const SUPER_CTX = {
  tenantId: 'tenant-1',
  userId: 'super-1',
  userRole: 'SUPER_ADMIN' as const,
};
const STUDENT_CTX = {
  tenantId: 'tenant-1',
  userId: 'student-1',
  userRole: 'STUDENT' as const,
};

/**
 * Build a mock tx that makes the select/join chain return the given rows.
 * withTenantContext calls callback(tx) — we need tx.select().from()... to resolve.
 */
function makeMockTx(rows: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(() => {
    vi.clearAllMocks();
    const pdfService = {
      generatePdf: vi.fn().mockResolvedValue(Buffer.from('pdf-content')),
    } as unknown as CompliancePdfService;
    service = new ComplianceService(pdfService);
  });

  describe('role guard', () => {
    it('throws ForbiddenException for STUDENT on generateComplianceReport', async () => {
      await expect(
        service.generateComplianceReport(['c1'], STUDENT_CTX)
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for STUDENT on listComplianceCourses', async () => {
      await expect(service.listComplianceCourses(STUDENT_CTX)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws ForbiddenException for INSTRUCTOR role', async () => {
      const ctx = { ...ADMIN_CTX, userRole: 'INSTRUCTOR' as const };
      await expect(
        service.generateComplianceReport(['c1'], ctx)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateComplianceReport', () => {
    it('returns empty report with zero stats for empty courseIds', async () => {
      const result = await service.generateComplianceReport([], ADMIN_CTX);
      expect(result.summary.totalEnrollments).toBe(0);
      expect(result.summary.completionRate).toBe(0);
      expect(result.csvUrl).toBeTruthy();
      expect(result.pdfUrl).toBeTruthy();
    });

    it('computes 100% completion rate when all rows are completed', async () => {
      const rawRows = [
        {
          userId: 'u1',
          courseId: 'c1',
          enrolledAt: new Date('2026-01-01'),
          completedAt: new Date('2026-01-10'),
          courseTitle: 'Safety',
          courseDueDate: new Date('2026-02-01'),
          userEmail: 'a@b.com',
          userFirstName: 'Alice',
          userLastName: 'Smith',
        },
        {
          userId: 'u2',
          courseId: 'c1',
          enrolledAt: new Date('2026-01-02'),
          completedAt: new Date('2026-01-11'),
          courseTitle: 'Safety',
          courseDueDate: new Date('2026-02-01'),
          userEmail: 'b@b.com',
          userFirstName: 'Bob',
          userLastName: 'Jones',
        },
      ];
      // withTenantContext invokes the callback with our mock tx
      mockWithTenantContext.mockImplementationOnce(
        (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
          fn(makeMockTx(rawRows))
      );
      const result = await service.generateComplianceReport(['c1'], ADMIN_CTX);
      expect(result.summary.completionRate).toBe(100);
      expect(result.summary.overdueCount).toBe(0);
      expect(result.summary.totalEnrollments).toBe(2);
    });

    it('marks enrollment as overdue when due date is before asOf and not completed', async () => {
      const rawRows = [
        {
          userId: 'u1',
          courseId: 'c1',
          enrolledAt: new Date('2025-11-01'),
          completedAt: null,
          courseTitle: 'GDPR',
          courseDueDate: new Date('2025-12-01'),
          userEmail: 'x@y.com',
          userFirstName: 'X',
          userLastName: 'Y',
        },
      ];
      mockWithTenantContext.mockImplementationOnce(
        (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
          fn(makeMockTx(rawRows))
      );
      const result = await service.generateComplianceReport(
        ['c1'],
        ADMIN_CTX,
        new Date('2026-01-01')
      );
      expect(result.summary.overdueCount).toBe(1);
      expect(result.summary.completionRate).toBe(0);
    });

    it('accepts SUPER_ADMIN role without throwing', async () => {
      mockWithTenantContext.mockImplementationOnce(
        (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
          fn(makeMockTx([]))
      );
      const result = await service.generateComplianceReport(['c1'], SUPER_CTX);
      expect(result.summary.totalEnrollments).toBe(0);
    });
  });

  // ── BUG-004 regression: listComplianceCourses filter ─────────────────────
  // Before the fix, the query filtered by `is_compliance = true` which
  // returned only already-flagged courses — admins couldn't add new ones.
  // After the fix, the query filters by `is_published = true` so all
  // published courses appear regardless of their current compliance status.

  describe('listComplianceCourses — BUG-004 regression', () => {
    it('throws ForbiddenException for non-admin role', async () => {
      await expect(service.listComplianceCourses(STUDENT_CTX)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('calls withTenantContext and returns courses', async () => {
      const fakeCourses = [
        {
          id: 'c1',
          title: 'Safety',
          slug: 'safety',
          is_compliance: false,
          is_published: true,
          compliance_due_date: null,
          estimated_hours: null,
          deleted_at: null,
        },
      ];
      mockWithTenantContext.mockImplementationOnce(
        (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
          fn(makeMockTx(fakeCourses))
      );

      const result = await service.listComplianceCourses(ADMIN_CTX);
      expect(result).toEqual(fakeCourses);
    });

    it('[BUG-004] filters by is_published=true, NOT is_compliance=true', async () => {
      const { eq } = await import('@edusphere/db');
      mockWithTenantContext.mockImplementationOnce(
        (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
          fn(makeMockTx([]))
      );

      await service.listComplianceCourses(ADMIN_CTX);

      // The fix: filter must use is_published field, not is_compliance
      expect(eq).toHaveBeenCalledWith('is_published', true);
      expect(eq).not.toHaveBeenCalledWith('is_compliance', true);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledOnce();
    });
  });
});

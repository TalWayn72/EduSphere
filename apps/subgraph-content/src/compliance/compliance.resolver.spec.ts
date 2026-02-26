import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ComplianceResolver } from './compliance.resolver.js';
import type { ComplianceService } from './compliance.service.js';

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

const mockListComplianceCourses = vi.fn();
const mockGenerateComplianceReport = vi.fn();
const mockUpdateCourseComplianceSettings = vi.fn();

const mockService = {
  listComplianceCourses: mockListComplianceCourses,
  generateComplianceReport: mockGenerateComplianceReport,
  updateCourseComplianceSettings: mockUpdateCourseComplianceSettings,
} as unknown as ComplianceService;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_AUTH = {
  tenantId: 'tenant-1',
  userId: 'admin-1',
  roles: ['ORG_ADMIN'],
};
const makeCtx = (auth = ADMIN_AUTH) => ({ authContext: auth });

const MOCK_REPORT = {
  csvUrl: 'https://minio.example.com/report.csv',
  pdfUrl: 'https://minio.example.com/report.pdf',
  summary: {
    totalUsers: 5,
    totalEnrollments: 10,
    completedCount: 8,
    completionRate: 80,
    overdueCount: 1,
    generatedAt: new Date('2026-02-15T12:00:00.000Z'),
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComplianceResolver', () => {
  let resolver: ComplianceResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ComplianceResolver(mockService);
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  describe('requireAuth (tested via getComplianceCourses)', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.getComplianceCourses({ authContext: undefined })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = {
        authContext: {
          tenantId: undefined,
          userId: 'u1',
          roles: ['ORG_ADMIN'],
        },
      };
      await expect(
        resolver.getComplianceCourses(
          ctx as Parameters<typeof resolver.getComplianceCourses>[0]
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = {
        authContext: {
          tenantId: 'tenant-1',
          userId: undefined,
          roles: ['ORG_ADMIN'],
        },
      };
      await expect(
        resolver.getComplianceCourses(
          ctx as Parameters<typeof resolver.getComplianceCourses>[0]
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── getComplianceCourses ───────────────────────────────────────────────────

  describe('getComplianceCourses', () => {
    it('returns snake_case DB rows mapped to camelCase GraphQL shape', async () => {
      mockListComplianceCourses.mockResolvedValueOnce([
        {
          id: 'c1',
          title: 'GDPR Training',
          slug: 'gdpr-training',
          is_compliance: true,
          compliance_due_date: new Date('2026-06-01T00:00:00.000Z'),
          is_published: true,
          estimated_hours: 2,
        },
      ]);

      const result = await resolver.getComplianceCourses(makeCtx());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'c1',
        title: 'GDPR Training',
        slug: 'gdpr-training',
        isCompliance: true,
        complianceDueDate: '2026-06-01T00:00:00.000Z',
        isPublished: true,
        estimatedHours: 2,
      });
    });

    it('maps null compliance_due_date and null estimated_hours to null', async () => {
      mockListComplianceCourses.mockResolvedValueOnce([
        {
          id: 'c2',
          title: 'Safety 101',
          slug: 'safety-101',
          is_compliance: false,
          compliance_due_date: null,
          is_published: true,
          estimated_hours: null,
        },
      ]);

      const [course] = await resolver.getComplianceCourses(makeCtx());
      expect(course.complianceDueDate).toBeNull();
      expect(course.estimatedHours).toBeNull();
    });

    it('returns an empty array when no courses exist', async () => {
      mockListComplianceCourses.mockResolvedValueOnce([]);
      const result = await resolver.getComplianceCourses(makeCtx());
      expect(result).toEqual([]);
    });

    it('passes the correct TenantContext to the service', async () => {
      mockListComplianceCourses.mockResolvedValueOnce([]);
      await resolver.getComplianceCourses(makeCtx());

      expect(mockListComplianceCourses).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'admin-1',
        userRole: 'ORG_ADMIN',
      });
    });

    it('uses first role from roles array as userRole', async () => {
      mockListComplianceCourses.mockResolvedValueOnce([]);
      const ctx = makeCtx({
        tenantId: 't1',
        userId: 'u1',
        roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
      });
      await resolver.getComplianceCourses(ctx);

      const [calledCtx] = mockListComplianceCourses.mock.calls[0];
      expect(calledCtx.userRole).toBe('SUPER_ADMIN');
    });

    it('defaults to STUDENT when roles array is empty', async () => {
      mockListComplianceCourses.mockResolvedValueOnce([]);
      const ctx = makeCtx({ tenantId: 't1', userId: 'u1', roles: [] });
      await resolver.getComplianceCourses(ctx);

      const [calledCtx] = mockListComplianceCourses.mock.calls[0];
      expect(calledCtx.userRole).toBe('STUDENT');
    });
  });

  // ── generateComplianceReport ───────────────────────────────────────────────

  describe('generateComplianceReport', () => {
    it('maps generatedAt Date to ISO string', async () => {
      mockGenerateComplianceReport.mockResolvedValueOnce(MOCK_REPORT);

      const result = await resolver.generateComplianceReport(
        ['c1'],
        undefined,
        makeCtx()
      );

      expect(result.summary.generatedAt).toBe('2026-02-15T12:00:00.000Z');
    });

    it('returns csvUrl and pdfUrl unchanged', async () => {
      mockGenerateComplianceReport.mockResolvedValueOnce(MOCK_REPORT);

      const result = await resolver.generateComplianceReport(
        ['c1'],
        undefined,
        makeCtx()
      );

      expect(result.csvUrl).toBe('https://minio.example.com/report.csv');
      expect(result.pdfUrl).toBe('https://minio.example.com/report.pdf');
    });

    it('passes parsed Date to service when valid asOf string provided', async () => {
      mockGenerateComplianceReport.mockResolvedValueOnce(MOCK_REPORT);

      await resolver.generateComplianceReport(['c1'], '2026-01-31', makeCtx());

      const [, , asOfArg] = mockGenerateComplianceReport.mock.calls[0];
      expect(asOfArg).toBeInstanceOf(Date);
      expect((asOfArg as Date).getFullYear()).toBe(2026);
      expect((asOfArg as Date).getMonth()).toBe(0); // January
    });

    it('passes undefined asOf to service when asOf is empty string', async () => {
      mockGenerateComplianceReport.mockResolvedValueOnce(MOCK_REPORT);

      await resolver.generateComplianceReport(['c1'], '', makeCtx());

      const [, , asOfArg] = mockGenerateComplianceReport.mock.calls[0];
      expect(asOfArg).toBeUndefined();
    });

    it('passes undefined asOf to service when asOf is not a valid date', async () => {
      mockGenerateComplianceReport.mockResolvedValueOnce(MOCK_REPORT);

      await resolver.generateComplianceReport(['c1'], 'not-a-date', makeCtx());

      const [, , asOfArg] = mockGenerateComplianceReport.mock.calls[0];
      expect(asOfArg).toBeUndefined();
    });

    it('throws UnauthorizedException for unauthenticated request', async () => {
      await expect(
        resolver.generateComplianceReport(['c1'], undefined, {
          authContext: undefined,
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── updateCourseComplianceSettings ────────────────────────────────────────

  describe('updateCourseComplianceSettings', () => {
    it('returns camelCase shape from DB row', async () => {
      mockUpdateCourseComplianceSettings.mockResolvedValueOnce({
        id: 'c1',
        title: 'GDPR',
        slug: 'gdpr',
        is_compliance: true,
        compliance_due_date: new Date('2026-06-30T00:00:00.000Z'),
        is_published: true,
        estimated_hours: 3,
      });

      const result = await resolver.updateCourseComplianceSettings(
        'c1',
        true,
        '2026-06-30',
        makeCtx()
      );

      expect(result.isCompliance).toBe(true);
      expect(result.complianceDueDate).toBe('2026-06-30T00:00:00.000Z');
      expect(result.estimatedHours).toBe(3);
    });

    it('passes null dueDate to service when complianceDueDate is undefined', async () => {
      mockUpdateCourseComplianceSettings.mockResolvedValueOnce({
        id: 'c1',
        title: 'Safety',
        slug: 'safety',
        is_compliance: false,
        compliance_due_date: null,
        is_published: true,
        estimated_hours: null,
      });

      await resolver.updateCourseComplianceSettings(
        'c1',
        false,
        undefined,
        makeCtx()
      );

      const [, , dueDateArg] = mockUpdateCourseComplianceSettings.mock.calls[0];
      expect(dueDateArg).toBeNull();
    });

    it('passes parsed Date to service when valid string provided', async () => {
      mockUpdateCourseComplianceSettings.mockResolvedValueOnce({
        id: 'c1',
        title: 'Safety',
        slug: 'safety',
        is_compliance: true,
        compliance_due_date: new Date('2026-12-31'),
        is_published: true,
        estimated_hours: null,
      });

      await resolver.updateCourseComplianceSettings(
        'c1',
        true,
        '2026-12-31',
        makeCtx()
      );

      const [, , dueDateArg] = mockUpdateCourseComplianceSettings.mock.calls[0];
      expect(dueDateArg).toBeInstanceOf(Date);
    });

    it('throws UnauthorizedException for unauthenticated request', async () => {
      await expect(
        resolver.updateCourseComplianceSettings('c1', true, undefined, {
          authContext: undefined,
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

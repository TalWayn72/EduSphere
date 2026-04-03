/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtRiskDetectionService } from './at-risk-detection.service';

const mockFlagService = {
  getDb: vi.fn(() => ({})),
  findActiveFlag: vi.fn(),
  createFlag: vi.fn(),
  publishFlagEvent: vi.fn(),
  resolveFlag: vi.fn(),
};

const { mockWithTenantCtx, mockWithBypassRLS } = vi.hoisted(() => ({
  mockWithTenantCtx: vi.fn(),
  mockWithBypassRLS: vi.fn(),
}));

vi.mock('@edusphere/db', () => ({
  schema: {
    tenants: { id: 'id' },
    userCourses: {
      userId: 'user_id',
      courseId: 'course_id',
      enrolledAt: 'enrolled_at',
      status: 'status',
    },
    courses: {
      id: 'id',
      tenant_id: 'tenant_id',
      estimated_hours: 'estimated_hours',
    },
    userProgress: {
      lastAccessedAt: 'last_accessed_at',
      isCompleted: 'is_completed',
      userId: 'user_id',
      contentItemId: 'content_item_id',
    },
    contentItems: { id: 'id', moduleId: 'module_id' },
    modules: { id: 'id', course_id: 'course_id' },
    quizResults: {
      passed: 'passed',
      userId: 'user_id',
      contentItemId: 'content_item_id',
    },
    atRiskFlags: { id: 'id' },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...c: unknown[]) => ({ and: c })),
  withTenantContext: mockWithTenantCtx,
  withBypassRLS: mockWithBypassRLS,
}));

vi.mock('@edusphere/config', () => ({
  TIME: {
    SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000,
  },
}));

vi.mock('./risk-scorer.js', () => ({
  computeRiskScore: vi.fn((metrics: { daysSinceLastActivity: number }) => ({
    score: metrics.daysSinceLastActivity > 7 ? 85 : 20,
    factors: { inactiveForDays: metrics.daysSinceLastActivity > 7 },
    isAtRisk: metrics.daysSinceLastActivity > 7,
  })),
}));

describe('AtRiskDetectionService', () => {
  let service: AtRiskDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AtRiskDetectionService(mockFlagService as any);
    // Default: withBypassRLS resolves to empty tenants
    mockWithBypassRLS.mockResolvedValue([]);
    // Default: withTenantContext resolves to empty array
    mockWithTenantCtx.mockResolvedValue([]);
  });

  describe('runNightlyDetection()', () => {
    it('calls detectAcrossAllTenants without throwing', async () => {
      mockWithBypassRLS.mockResolvedValueOnce([{ id: 'tenant-1' }]);
      // enrollments query returns empty
      mockWithTenantCtx.mockResolvedValueOnce([]);

      await expect(service.runNightlyDetection()).resolves.toBeUndefined();
    });

    it('does not throw when detection fails internally', async () => {
      mockWithBypassRLS.mockRejectedValueOnce(new Error('DB down'));

      await expect(service.runNightlyDetection()).resolves.toBeUndefined();
    });
  });

  describe('processEnrollment (via runNightlyDetection)', () => {
    it('flags at-risk learner when no existing flag', async () => {
      // withBypassRLS: return tenants
      mockWithBypassRLS.mockResolvedValueOnce([{ id: 't1' }]);
      // withTenantContext call 1: enrollments
      mockWithTenantCtx.mockResolvedValueOnce([
        {
          userId: 'u1',
          courseId: 'c1',
          enrolledAt: new Date('2025-01-01'),
          estimatedHours: 10,
        },
      ]);
      // withTenantContext calls 2 & 3: progress + quizzes (Promise.all)
      mockWithTenantCtx
        .mockResolvedValueOnce([]) // progress — empty = high risk
        .mockResolvedValueOnce([]); // quizzes — empty

      mockFlagService.findActiveFlag.mockResolvedValue(null);
      mockFlagService.createFlag.mockResolvedValue(undefined);
      mockFlagService.publishFlagEvent.mockResolvedValue(undefined);

      await service.runNightlyDetection();

      expect(mockFlagService.createFlag).toHaveBeenCalledWith(
        'u1',
        'c1',
        't1',
        expect.any(Number),
        expect.any(Object)
      );
      expect(mockFlagService.publishFlagEvent).toHaveBeenCalled();
    });

    it('resolves flag when learner is no longer at-risk', async () => {
      mockWithBypassRLS.mockResolvedValueOnce([{ id: 't1' }]);
      // enrollments
      mockWithTenantCtx.mockResolvedValueOnce([
        {
          userId: 'u1',
          courseId: 'c1',
          enrolledAt: new Date(),
          estimatedHours: 100,
        },
      ]);
      // Recent activity -> not at risk (daysSince = 0)
      const now = new Date();
      mockWithTenantCtx
        .mockResolvedValueOnce([{ lastAccessedAt: now, isCompleted: true }])
        .mockResolvedValueOnce([{ passed: true }]);

      mockFlagService.findActiveFlag.mockResolvedValue({ id: 'flag-1' });
      mockFlagService.resolveFlag.mockResolvedValue(undefined);

      await service.runNightlyDetection();

      expect(mockFlagService.resolveFlag).toHaveBeenCalledWith(
        'flag-1',
        expect.any(Object)
      );
    });

    it('does nothing when risk status is unchanged', async () => {
      mockWithBypassRLS.mockResolvedValueOnce([{ id: 't1' }]);
      mockWithTenantCtx.mockResolvedValueOnce([
        {
          userId: 'u1',
          courseId: 'c1',
          enrolledAt: new Date('2025-01-01'),
          estimatedHours: 10,
        },
      ]);
      mockWithTenantCtx
        .mockResolvedValueOnce([]) // progress
        .mockResolvedValueOnce([]); // quizzes

      // Already flagged and still at risk
      mockFlagService.findActiveFlag.mockResolvedValue({ id: 'flag-1' });

      await service.runNightlyDetection();

      expect(mockFlagService.createFlag).not.toHaveBeenCalled();
      expect(mockFlagService.resolveFlag).not.toHaveBeenCalled();
    });
  });
});

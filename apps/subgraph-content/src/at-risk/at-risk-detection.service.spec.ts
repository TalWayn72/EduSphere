import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtRiskDetectionService } from './at-risk-detection.service';

const mockFlagService = {
  getDb: vi.fn(() => mockDb),
  findActiveFlag: vi.fn(),
  createFlag: vi.fn(),
  publishFlagEvent: vi.fn(),
  resolveFlag: vi.fn(),
};

const mockTx = { select: vi.fn() };
const mockDb = {} as any;

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
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
  withBypassRLS: vi.fn((_db, fn) => fn(mockTx)),
}));

vi.mock('@edusphere/config', () => ({
  TIME: {
    SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000,
  },
}));

vi.mock('./risk-scorer.js', () => ({
  computeRiskScore: vi.fn((metrics) => ({
    score: metrics.daysSinceLastActivity > 7 ? 85 : 20,
    factors: { inactiveForDays: metrics.daysSinceLastActivity > 7 },
    isAtRisk: metrics.daysSinceLastActivity > 7,
  })),
}));

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit, then: undefined });
  const from = vi.fn().mockReturnValue({ where });
  const innerJoin = vi.fn().mockReturnValue({ where, innerJoin: vi.fn().mockReturnValue({ where }) });
  return { from, where, limit, innerJoin };
}

function makeSelectChainJoin(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const innerJoin2 = vi.fn().mockReturnValue({ where });
  const innerJoin1 = vi.fn().mockReturnValue({ innerJoin: innerJoin2 });
  const from = vi.fn().mockReturnValue({ innerJoin: innerJoin1 });
  return { from, where };
}

describe('AtRiskDetectionService', () => {
  let service: AtRiskDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AtRiskDetectionService(mockFlagService as any);
  });

  describe('runNightlyDetection()', () => {
    it('calls detectAcrossAllTenants without throwing', async () => {
      // bypassRLS returns tenants
      const tenantChain = makeSelectChain([{ id: 'tenant-1' }]);
      // userCourses join — empty enrollments for simplicity
      const enrollChain = makeSelectChainJoin([]);
      mockTx.select
        .mockReturnValueOnce({ from: tenantChain.from })
        .mockReturnValueOnce({ from: enrollChain.from });

      await expect(service.runNightlyDetection()).resolves.toBeUndefined();
    });

    it('does not throw when detection fails internally', async () => {
      const { withBypassRLS } = await import('@edusphere/db');
      (withBypassRLS as any).mockRejectedValueOnce(new Error('DB down'));

      await expect(service.runNightlyDetection()).resolves.toBeUndefined();
    });
  });

  describe('processEnrollment (via runNightlyDetection)', () => {
    it('flags at-risk learner when no existing flag', async () => {
      // Tenants
      const tenantChain = makeSelectChain([{ id: 't1' }]);
      // Enrollments (one active enrollment)
      const enrollChain = makeSelectChainJoin([{
        userId: 'u1',
        courseId: 'c1',
        enrolledAt: new Date('2025-01-01'),
        estimatedHours: 10,
      }]);
      // progress rows — empty (no activity = high risk)
      const progressChain = makeSelectChainJoin([]);
      const quizChain = makeSelectChainJoin([]);

      mockTx.select
        .mockReturnValueOnce({ from: tenantChain.from })  // tenants
        .mockReturnValueOnce({ from: enrollChain.from })   // enrollments
        .mockReturnValueOnce({ from: progressChain.from }) // progress
        .mockReturnValueOnce({ from: quizChain.from });    // quizzes

      mockFlagService.findActiveFlag.mockResolvedValue(null);
      mockFlagService.createFlag.mockResolvedValue(undefined);
      mockFlagService.publishFlagEvent.mockResolvedValue(undefined);

      await service.runNightlyDetection();

      expect(mockFlagService.createFlag).toHaveBeenCalledWith(
        'u1', 'c1', 't1', expect.any(Number), expect.any(Object),
      );
      expect(mockFlagService.publishFlagEvent).toHaveBeenCalled();
    });

    it('resolves flag when learner is no longer at-risk', async () => {
      const tenantChain = makeSelectChain([{ id: 't1' }]);
      const enrollChain = makeSelectChainJoin([{
        userId: 'u1', courseId: 'c1',
        enrolledAt: new Date(), estimatedHours: 100,
      }]);
      // Recent activity -> not at risk (daysSince = 0)
      const now = new Date();
      const progressChain = makeSelectChainJoin([
        { lastAccessedAt: now, isCompleted: true },
      ]);
      const quizChain = makeSelectChainJoin([{ passed: true }]);

      mockTx.select
        .mockReturnValueOnce({ from: tenantChain.from })
        .mockReturnValueOnce({ from: enrollChain.from })
        .mockReturnValueOnce({ from: progressChain.from })
        .mockReturnValueOnce({ from: quizChain.from });

      mockFlagService.findActiveFlag.mockResolvedValue({ id: 'flag-1' });
      mockFlagService.resolveFlag.mockResolvedValue(undefined);

      await service.runNightlyDetection();

      expect(mockFlagService.resolveFlag).toHaveBeenCalledWith(
        'flag-1', expect.any(Object),
      );
    });

    it('does nothing when risk status is unchanged', async () => {
      const tenantChain = makeSelectChain([{ id: 't1' }]);
      const enrollChain = makeSelectChainJoin([{
        userId: 'u1', courseId: 'c1',
        enrolledAt: new Date('2025-01-01'), estimatedHours: 10,
      }]);
      const progressChain = makeSelectChainJoin([]);
      const quizChain = makeSelectChainJoin([]);

      mockTx.select
        .mockReturnValueOnce({ from: tenantChain.from })
        .mockReturnValueOnce({ from: enrollChain.from })
        .mockReturnValueOnce({ from: progressChain.from })
        .mockReturnValueOnce({ from: quizChain.from });

      // Already flagged and still at risk
      mockFlagService.findActiveFlag.mockResolvedValue({ id: 'flag-1' });

      await service.runNightlyDetection();

      expect(mockFlagService.createFlag).not.toHaveBeenCalled();
      expect(mockFlagService.resolveFlag).not.toHaveBeenCalled();
    });
  });
});

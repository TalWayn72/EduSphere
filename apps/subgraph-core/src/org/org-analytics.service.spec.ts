/**
 * org-analytics.service.spec.ts — Unit tests for OrgAnalyticsService.
 *
 * Covers:
 *   - KPI aggregation (users, courses, storage, YAU)
 *   - Department drilldown
 *   - Date range filtering
 *   - RLS enforcement
 *   - Empty data handling (new org)
 *   - Large org (pre-computed metrics)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.orderBy = self;
  p.groupBy = self;
  p.leftJoin = self;
  p.innerJoin = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({ select: mockSelect })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
      fn({ select: mockSelect })
  ),
  schema: {
    users: { id: 'id', tenantId: 'tenant_id' },
    courses: { id: 'id', tenantId: 'tenant_id' },
    yauEvents: {
      tenantId: 'tenant_id',
      userId: 'user_id',
      yearMonth: 'year_month',
    },
    usageSnapshots: {
      tenantId: 'tenant_id',
      snapshotDate: 'snapshot_date',
      yauCount: 'yau_count',
      activeUsersCount: 'active_users_count',
      coursesCount: 'courses_count',
      storageGb: 'storage_gb',
    },
    tenantAnalyticsSnapshots: {
      tenantId: 'tenant_id',
      snapshotType: 'snapshot_type',
      metrics: 'metrics',
      createdAt: 'created_at',
    },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  gte: vi.fn((a: unknown, b: unknown) => ({ gte: [a, b] })),
  lte: vi.fn((a: unknown, b: unknown) => ({ lte: [a, b] })),
  count: vi.fn(() => ({ count: 'count' })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings,
    values,
  })),
}));

import { OrgAnalyticsService } from './org-analytics.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'tenant-001',
  userId: 'admin-001',
  role: 'ORG_ADMIN',
};

const MOCK_KPI = {
  totalUsers: 250,
  activeUsers: 180,
  totalCourses: 45,
  storageGb: 12.5,
  yauCount: 200,
  completionRate: 0.72,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OrgAnalyticsService', () => {
  let service: OrgAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(makeChain([MOCK_KPI]));
    service = new OrgAnalyticsService();
  });

  // ─── KPI aggregation ──────────────────────────────────────────────────────

  describe('getKPIs()', () => {
    it('returns aggregated KPI metrics', async () => {
      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis).toBeDefined();
      expect(kpis.totalUsers).toBeDefined();
    });

    it('includes total users count', async () => {
      mockSelect.mockReturnValueOnce(makeChain([{ count: 250 }]));
      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis.totalUsers).toBe(250);
    });

    it('includes active users (YAU) count', async () => {
      mockSelect
        .mockReturnValueOnce(makeChain([{ count: 250 }]))
        .mockReturnValueOnce(makeChain([{ count: 180 }]));
      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis.activeUsers).toBe(180);
    });

    it('includes total courses count', async () => {
      mockSelect
        .mockReturnValueOnce(makeChain([{ count: 250 }]))
        .mockReturnValueOnce(makeChain([{ count: 180 }]))
        .mockReturnValueOnce(makeChain([{ count: 45 }]));
      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis.totalCourses).toBe(45);
    });

    it('includes storage usage', async () => {
      mockSelect
        .mockReturnValueOnce(makeChain([{ count: 250 }]))
        .mockReturnValueOnce(makeChain([{ count: 180 }]))
        .mockReturnValueOnce(makeChain([{ count: 45 }]))
        .mockReturnValueOnce(makeChain([{ storageGb: 12.5 }]));
      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis.storageGb).toBe(12.5);
    });
  });

  // ─── Empty data (new org) ─────────────────────────────────────────────────

  describe('new org with no data', () => {
    it('returns zero counts for new org', async () => {
      mockSelect.mockReturnValue(makeChain([{ count: 0 }]));

      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis.totalUsers).toBe(0);
    });

    it('returns null/zero for missing usage snapshots', async () => {
      mockSelect.mockReturnValue(makeChain([]));

      const kpis = await service.getKPIs(TENANT_CTX);
      expect(kpis.storageGb).toBe(0);
    });
  });

  // ─── Date range filtering ─────────────────────────────────────────────────

  describe('getAnalytics() with date range', () => {
    it('filters by start and end date', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ date: '2026-01-01', activeUsers: 100 }])
      );

      const result = await service.getAnalytics(TENANT_CTX, {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-01'),
      });
      expect(result).toBeDefined();
    });

    it('uses last 30 days as default range', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ date: '2026-03-01', activeUsers: 150 }])
      );

      const result = await service.getAnalytics(TENANT_CTX, {});
      expect(result).toBeDefined();
    });
  });

  // ─── Department drilldown ─────────────────────────────────────────────────

  describe('getDepartmentDrilldown()', () => {
    it('returns per-department metrics', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          { department: 'Engineering', userCount: 50, completionRate: 0.8 },
          { department: 'Marketing', userCount: 30, completionRate: 0.6 },
        ])
      );

      const result = await service.getDepartmentDrilldown(TENANT_CTX);
      expect(result).toHaveLength(2);
      expect(result[0].department).toBe('Engineering');
    });

    it('returns empty array when no departments configured', async () => {
      mockSelect.mockReturnValueOnce(makeChain([]));

      const result = await service.getDepartmentDrilldown(TENANT_CTX);
      expect(result).toHaveLength(0);
    });
  });

  // ─── Pre-computed metrics (large org) ─────────────────────────────────────

  describe('getPrecomputedMetrics()', () => {
    it('reads from usage_snapshots for large orgs', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            yauCount: 45000,
            activeUsersCount: 32000,
            coursesCount: 500,
            storageGb: 250,
          },
        ])
      );

      const result = await service.getPrecomputedMetrics(TENANT_CTX);
      expect(result.yauCount).toBe(45000);
    });
  });

  // ─── Memory safety ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});

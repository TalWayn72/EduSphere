/**
 * admin-overview.resolver.spec.ts — Unit tests for AdminOverviewResolver.
 * Direct class instantiation, no TestingModule.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  db: {},
  users: {},
  scimSyncLog: {},
  count: vi.fn(),
  gte: vi.fn(),
  eq: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { AdminOverviewResolver } from './admin-overview.resolver.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const OVERVIEW_DATA = {
  totalUsers: 42,
  activeUsersThisMonth: 10,
  totalCourses: 0,
  completionsThisMonth: 0,
  atRiskCount: 0,
  lastScimSync: '2026-02-01T00:00:00.000Z',
  lastComplianceReport: null,
  storageUsedMb: 0,
};

const DASHBOARD_STATS_DATA = {
  totalUsers: 42,
  activeUsers: 10,
  totalCourses: 5,
  publishedCourses: 3,
  totalAnnotations: 100,
  storageUsedMb: 0,
};

function makeService(
  overrides: Partial<{
    getOverview: () => Promise<unknown>;
    getDashboardStats: () => Promise<unknown>;
  }> = {}
) {
  return {
    getOverview: vi.fn().mockResolvedValue(OVERVIEW_DATA),
    getDashboardStats: vi.fn().mockResolvedValue(DASHBOARD_STATS_DATA),
    ...overrides,
  };
}

function makeContext(authContext?: Record<string, unknown>) {
  return { req: {}, authContext } as unknown as Parameters<
    AdminOverviewResolver['adminOverview']
  >[0];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminOverviewResolver', () => {
  let resolver: AdminOverviewResolver;
  let mockService: ReturnType<typeof makeService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = makeService();
    resolver = new AdminOverviewResolver(mockService as never);
  });

  it('throws UnauthorizedException when authContext is absent', async () => {
    await expect(
      resolver.adminOverview(makeContext(undefined))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('calls service.getOverview with tenantId from authContext', async () => {
    const ctx = makeContext({
      tenantId: 'tenant-abc',
      userId: 'u1',
      roles: [],
    });
    await resolver.adminOverview(ctx);
    expect(mockService.getOverview).toHaveBeenCalledWith('tenant-abc');
  });

  it('passes empty string to service when tenantId is missing from authContext', async () => {
    const ctx = makeContext({ userId: 'u1', roles: [] }); // no tenantId
    await resolver.adminOverview(ctx);
    expect(mockService.getOverview).toHaveBeenCalledWith('');
  });

  it('returns the result from service.getOverview', async () => {
    const ctx = makeContext({ tenantId: 'tenant-1', userId: 'u1', roles: [] });
    const result = await resolver.adminOverview(ctx);
    expect(result).toBe(OVERVIEW_DATA);
  });

  it('preserves the full result shape returned by the service', async () => {
    const ctx = makeContext({ tenantId: 'tenant-1', userId: 'u1', roles: [] });
    const result = (await resolver.adminOverview(ctx)) as typeof OVERVIEW_DATA;
    expect(result.totalUsers).toBe(42);
    expect(result.lastScimSync).toBe('2026-02-01T00:00:00.000Z');
    expect(result.storageUsedMb).toBe(0);
  });

  // ─── adminDashboardStats (Phase 1) ───────────────────────────────────────

  it('adminDashboardStats throws UnauthorizedException when authContext absent', async () => {
    await expect(
      resolver.adminDashboardStats(makeContext(undefined))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adminDashboardStats calls service.getDashboardStats with tenantId', async () => {
    const ctx = makeContext({ tenantId: 'tenant-abc', userId: 'u1', roles: [] });
    await resolver.adminDashboardStats(ctx);
    expect(mockService.getDashboardStats).toHaveBeenCalledWith('tenant-abc');
  });

  it('adminDashboardStats returns result from service', async () => {
    const ctx = makeContext({ tenantId: 'tenant-1', userId: 'u1', roles: [] });
    const result = await resolver.adminDashboardStats(ctx);
    expect(result).toBe(DASHBOARD_STATS_DATA);
  });

  it('adminDashboardStats passes empty string when tenantId missing', async () => {
    const ctx = makeContext({ userId: 'u1', roles: [] });
    await resolver.adminDashboardStats(ctx);
    expect(mockService.getDashboardStats).toHaveBeenCalledWith('');
  });
});

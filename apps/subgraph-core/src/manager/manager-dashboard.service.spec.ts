import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    execute: vi.fn(),
    transaction: vi.fn(),
  })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
    { raw: vi.fn((s: string) => s) },
  ),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { ManagerDashboardService } from './manager-dashboard.service';
import { withTenantContext, closeAllPools } from '@edusphere/db';

describe('ManagerDashboardService', () => {
  let service: ManagerDashboardService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get the fresh mock db
    const { createDatabaseConnection } = await import('@edusphere/db');
    mockDb = (createDatabaseConnection as ReturnType<typeof vi.fn>)();
    service = new ManagerDashboardService();
  });

  it('returns zero overview when no members', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([]); // no members
      return fn(mockDb);
    });

    const result = await service.getTeamOverview('manager-1', 'tenant-1');
    expect(result.memberCount).toBe(0);
    expect(result.avgCompletionPct).toBe(0);
    expect(result.atRiskCount).toBe(0);
    expect(result.topCourseTitle).toBeNull();
    expect(withTenantContext).toHaveBeenCalledOnce();
  });

  it('returns member list with at-risk flag for inactive user', async () => {
    const twoWeeksAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([
        {
          user_id: 'user-1',
          display_name: 'Alice Cohen',
          courses_enrolled: 3,
          avg_completion: 45.5,
          total_xp: 150,
          level: 2,
          last_active_at: twoWeeksAgo,
        },
      ]);
      return fn(mockDb);
    });

    const result = await service.getTeamMemberProgress('manager-1', 'tenant-1');
    expect(result).toHaveLength(1);
    expect(result[0]!.isAtRisk).toBe(true);
    expect(result[0]!.displayName).toBe('Alice Cohen');
    expect(result[0]!.avgCompletionPct).toBe(45.5);
  });

  it('marks user as active when recently active', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([
        {
          user_id: 'user-2',
          display_name: 'Bob Levi',
          courses_enrolled: 1,
          avg_completion: 80.0,
          total_xp: 500,
          level: 5,
          last_active_at: yesterday,
        },
      ]);
      return fn(mockDb);
    });

    const result = await service.getTeamMemberProgress('manager-1', 'tenant-1');
    expect(result[0]!.isAtRisk).toBe(false);
  });

  it('uses ORG_ADMIN userRole for RLS context', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, ctx, fn) => {
      expect((ctx as { userRole: string }).userRole).toBe('ORG_ADMIN');
      mockDb.execute = vi.fn().mockResolvedValueOnce([]);
      return fn(mockDb);
    });
    await service.getTeamOverview('manager-1', 'tenant-1');
  });

  it('addTeamMember returns true', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce(undefined);
      return fn(mockDb);
    });
    const result = await service.addTeamMember('manager-1', 'member-1', 'tenant-1');
    expect(result).toBe(true);
  });

  it('removeTeamMember returns true', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      mockDb.execute = vi.fn().mockResolvedValueOnce(undefined);
      return fn(mockDb);
    });
    const result = await service.removeTeamMember('manager-1', 'member-1', 'tenant-1');
    expect(result).toBe(true);
  });

  it('calls closeAllPools on onModuleDestroy', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});

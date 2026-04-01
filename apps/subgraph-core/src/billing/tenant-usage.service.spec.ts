/**
 * tenant-usage.service.spec.ts — Unit tests for TenantUsageService.
 * Covers: getTenantUsage happy path, error fallback, onModuleDestroy cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
      fn({ select: mockSelect })
  ),
  schema: {
    users: { tenant_id: 'tenant_id' },
    courses: { tenant_id: 'tenant_id' },
    yauEvents: { tenantId: 'tenantId' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  count: vi.fn(() => 'COUNT(*)'),
}));

import { TenantUsageService } from './tenant-usage.service';

describe('TenantUsageService', () => {
  let service: TenantUsageService;

  const ctx = { tenantId: 't1', userId: 'u1', userRole: 'ORG_ADMIN' as const };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantUsageService();
  });

  describe('getTenantUsage', () => {
    it('should return aggregated usage metrics', async () => {
      // Promise.all in source calls select 3 times
      mockSelect
        .mockReturnValueOnce(makeChain([{ value: 42 }])) // users
        .mockReturnValueOnce(makeChain([{ value: 10 }])) // courses
        .mockReturnValueOnce(makeChain([{ value: 5 }])); // yau

      const result = await service.getTenantUsage(ctx);
      expect(result.activeUsers).toBe(42);
      expect(result.coursesCreated).toBe(10);
      expect(result.agentSessions).toBe(5);
      expect(result.storageUsedMb).toBe(0);
      expect(result.apiCalls).toBe(0);
    });

    it('should accept optional year parameter', async () => {
      mockSelect.mockReturnValue(makeChain([{ value: 0 }]));
      const result = await service.getTenantUsage(ctx, 2025);
      expect(result.activeUsers).toBe(0);
    });

    it('should return zeros on error', async () => {
      const { withTenantContext } = await import('@edusphere/db');
      vi.mocked(withTenantContext).mockRejectedValueOnce(new Error('db down'));

      const result = await service.getTenantUsage(ctx);
      expect(result).toEqual({
        activeUsers: 0,
        storageUsedMb: 0,
        apiCalls: 0,
        coursesCreated: 0,
        agentSessions: 0,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should call closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalled();
    });
  });
});

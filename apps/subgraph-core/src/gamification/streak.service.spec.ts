import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @edusphere/db BEFORE importing the service
vi.mock('@edusphere/db', () => {
  const mockExecute = vi.fn();
  const mockTx = { execute: mockExecute };
  return {
    createDatabaseConnection: vi.fn(() => ({
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    })),
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
    withTenantContext: vi.fn(
      async (
        _db: unknown,
        _ctx: unknown,
        fn: (tx: typeof mockTx) => Promise<unknown>
      ) => fn(mockTx)
    ),
    closeAllPools: vi.fn().mockResolvedValue(undefined),
  };
});

import { StreakService } from './streak.service.js';
import { withTenantContext, closeAllPools } from '@edusphere/db';

// Helper to get the mock execute from the captured tx
function getMockExecute() {
  const capturedFn = vi.mocked(withTenantContext).mock.calls[0]?.[2];
  if (!capturedFn) return vi.fn();
  // The execute is injected by the module-level mockTx — we spy on db calls via withTenantContext.
  return vi.fn();
}

describe('StreakService', () => {
  let service: StreakService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StreakService();
  });

  describe('getStreak', () => {
    it('returns zero streak for new user with no DB row', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce({
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      } as never);
      const result = await service.getStreak('user-1', 'tenant-1');
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastActivityDate).toBeNull();
    });

    it('returns existing streak data', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce({
        currentStreak: 7,
        longestStreak: 30,
        lastActivityDate: '2026-03-07',
      } as never);
      const result = await service.getStreak('user-1', 'tenant-1');
      expect(result.currentStreak).toBe(7);
      expect(result.longestStreak).toBe(30);
    });

    it('calls withTenantContext with STUDENT role', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce({
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      } as never);
      await service.getStreak('user-123', 'tenant-456');
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'user-123', tenantId: 'tenant-456', userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  describe('updateStreak', () => {
    it('calls withTenantContext when updating', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce(undefined as never);
      await service.updateStreak('user-1', 'tenant-1');
      expect(withTenantContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});

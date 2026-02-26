/**
 * Memory leak test for UserStatsService.
 *
 * Verifies that onModuleDestroy() calls closeAllPools() so DB connections
 * are released when the NestJS module tears down.
 *
 * Rule: every @Injectable() service with createDatabaseConnection() MUST
 * implement OnModuleDestroy calling closeAllPools().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = { select: vi.fn(), execute: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: { annotations: { user_id: 'user_id', tenant_id: 'tenant_id' } },
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  sql: vi.fn((strings, ...vals) => ({ strings, vals })),
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...conds) => ({ conds })),
}));

import { UserStatsService } from './user-stats.service.js';

describe('UserStatsService — memory safety', () => {
  let service: UserStatsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default mock: all DB calls return empty/zero results
    mockTx.execute.mockResolvedValue({ rows: [] });
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: '0' }]),
      }),
    });
    service = new UserStatsService();
  });

  it('calls closeAllPools() exactly once during onModuleDestroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onModuleDestroy() is called multiple times (idempotent)', async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('implements OnModuleDestroy interface (onModuleDestroy method exists)', () => {
    expect(typeof service.onModuleDestroy).toBe('function');
  });
});

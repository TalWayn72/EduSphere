/**
 * marketplace.earnings.service.memory.spec.ts
 * Memory safety: MarketplaceEarningsService calls closeAllPools() in onModuleDestroy().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    purchases: {},
    courseListings: {},
    courses: {},
    instructorPayouts: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn(),
}));

import { MarketplaceEarningsService } from './marketplace.earnings.service.js';

describe('MarketplaceEarningsService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new MarketplaceEarningsService()).not.toThrow();
  });

  it('onModuleDestroy() calls closeAllPools()', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const svc = new MarketplaceEarningsService();
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', async () => {
    const svc = new MarketplaceEarningsService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});

/**
 * consent.service.memory.spec.ts
 * Memory safety: ConsentService calls closeAllPools() in onModuleDestroy().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  })),
  schema: {
    userConsents: {},
    auditLog: {},
  },
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { ConsentService } from './consent.service.js';

describe('ConsentService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new ConsentService()).not.toThrow();
  });

  it('onModuleDestroy() calls closeAllPools()', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const svc = new ConsentService();
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', async () => {
    const svc = new ConsentService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});

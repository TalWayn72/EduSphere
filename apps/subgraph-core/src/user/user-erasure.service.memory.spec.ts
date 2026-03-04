/**
 * user-erasure.service.memory.spec.ts
 * Memory safety: UserErasureService calls closeAllPools() in onModuleDestroy().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  eq: vi.fn(),
  inArray: vi.fn(),
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
    delete: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  })),
  schema: {
    agentSessions: {},
    agentMessages: {},
    annotations: {},
    userProgress: {},
    userCourses: {},
    users: {},
    auditLog: {},
  },
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { UserErasureService } from './user-erasure.service.js';

describe('UserErasureService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new UserErasureService()).not.toThrow();
  });

  it('onModuleDestroy() calls closeAllPools()', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const svc = new UserErasureService();
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', async () => {
    const svc = new UserErasureService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});

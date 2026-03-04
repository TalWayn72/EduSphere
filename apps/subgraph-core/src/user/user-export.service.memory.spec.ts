/**
 * user-export.service.memory.spec.ts
 * Memory safety: UserExportService calls closeAllPools() in onModuleDestroy().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  eq: vi.fn(),
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  })),
  schema: {
    users: {},
    annotations: {},
    agentSessions: {},
    userProgress: {},
    userCourses: {},
    auditLog: {},
  },
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { UserExportService } from './user-export.service.js';

describe('UserExportService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new UserExportService()).not.toThrow();
  });

  it('onModuleDestroy() calls closeAllPools()', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const svc = new UserExportService();
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', async () => {
    const svc = new UserExportService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});

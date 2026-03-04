/**
 * retention-cleanup.service.memory.spec.ts
 * Memory safety: RetentionCleanupService calls closeAllPools() in onModuleDestroy().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  db: {
    delete: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
  },
  RETENTION_DEFAULTS: {},
  agentMessages: {},
  agentSessions: {},
  userProgress: {},
  annotations: {},
  lt: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { RetentionCleanupService } from './retention-cleanup.service.js';

describe('RetentionCleanupService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new RetentionCleanupService()).not.toThrow();
  });

  it('onModuleDestroy() calls closeAllPools()', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const svc = new RetentionCleanupService();
    await svc.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', async () => {
    const svc = new RetentionCleanupService();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});

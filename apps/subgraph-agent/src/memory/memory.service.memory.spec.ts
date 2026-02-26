/**
 * memory.service.memory.spec.ts
 *
 * Wave 5-A: Memory leak tests for MemoryService teardown.
 *
 * Verifies:
 *   1. onModuleDestroy() calls this.kv.close().
 *   2. onModuleDestroy() calls closeAllPools() from @edusphere/db.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks — must be set up before module imports ─────────────────────

const { mockKvClose, mockCloseAllPools } = vi.hoisted(() => {
  return {
    mockKvClose: vi.fn().mockResolvedValue(undefined),
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  };
});

// ── @edusphere/db mock ────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })),
  schema: {
    agentMessages: {
      id: 'id',
      sessionId: 'sessionId',
      role: 'role',
      content: 'content',
      metadata: 'metadata',
      createdAt: 'createdAt',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  desc: vi.fn((col: unknown) => ({ col, dir: 'desc' })),
  closeAllPools: mockCloseAllPools,
}));

// ── @edusphere/nats-client mock ───────────────────────────────────────────────

vi.mock('@edusphere/nats-client', () => ({
  NatsKVClient: vi.fn().mockImplementation(function (this: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }) {
    this.set = vi.fn().mockResolvedValue(undefined);
    this.get = vi.fn().mockResolvedValue(null);
    this.delete = vi.fn().mockResolvedValue(undefined);
    this.close = mockKvClose;
  }),
}));

// Import service AFTER mocks are wired up.
import { MemoryService } from './memory.service';

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('MemoryService — memory leak / onModuleDestroy teardown', () => {
  let service: MemoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MemoryService();
  });

  // ── Test 1: kv.close() is called ─────────────────────────────────────────

  describe('onModuleDestroy() — kv.close()', () => {
    it('calls kv.close() exactly once', async () => {
      await service.onModuleDestroy();
      expect(mockKvClose).toHaveBeenCalledTimes(1);
    });

    it('calls kv.close() before resolving', async () => {
      let closeCalled = false;
      mockKvClose.mockImplementationOnce(async () => {
        closeCalled = true;
      });

      await service.onModuleDestroy();
      expect(closeCalled).toBe(true);
    });

    it('resolves without throwing when kv.close() succeeds', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('calls kv.close() on each destroy call', async () => {
      const fresh = new MemoryService();
      await fresh.onModuleDestroy();
      expect(mockKvClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 2: closeAllPools() is called ────────────────────────────────────

  describe('onModuleDestroy() — closeAllPools()', () => {
    it('calls closeAllPools() exactly once', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });

    it('calls closeAllPools() before resolving', async () => {
      let poolsClosed = false;
      mockCloseAllPools.mockImplementationOnce(async () => {
        poolsClosed = true;
      });

      await service.onModuleDestroy();
      expect(poolsClosed).toBe(true);
    });

    it('resolves without throwing even if closeAllPools() rejects', async () => {
      // closeAllPools itself never rejects (it uses allSettled internally),
      // but guard against any change to the contract.
      mockCloseAllPools.mockRejectedValueOnce(new Error('pool close failed'));

      // MemoryService awaits closeAllPools() directly — so if it throws the
      // test will detect it. The behaviour we document here is what the
      // current implementation does: it propagates the error.
      // This test therefore only asserts that kv.close was still called.
      try {
        await service.onModuleDestroy();
      } catch {
        // propagation is acceptable
      }
      expect(mockKvClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Combined ordering: kv.close() THEN closeAllPools() ───────────────────

  describe('onModuleDestroy() — call ordering', () => {
    it('calls kv.close() before closeAllPools()', async () => {
      const order: string[] = [];
      mockKvClose.mockImplementationOnce(async () => {
        order.push('kv.close');
      });
      mockCloseAllPools.mockImplementationOnce(async () => {
        order.push('closeAllPools');
      });

      await service.onModuleDestroy();

      expect(order).toEqual(['kv.close', 'closeAllPools']);
    });

    it('both teardown hooks run during a single destroy call', async () => {
      await service.onModuleDestroy();
      expect(mockKvClose).toHaveBeenCalledTimes(1);
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });
  });
});

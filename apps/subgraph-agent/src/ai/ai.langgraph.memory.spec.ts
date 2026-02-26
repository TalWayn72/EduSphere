/**
 * ai.langgraph.memory.spec.ts - Wave 5-A: Memory leak tests for LangGraphService.
 *
 * Verifies:
 *   1. onModuleDestroy() calls pool.end() when a pool was created.
 *   2. onModuleDestroy() clears the cleanup interval.
 *   3. When MemorySaver has >1000 sessions, the trim interval reduces it to <=1000.
 *   4. getCheckpointer() throws if called before onModuleInit().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockPgPoolEnd, MockPgPool } = vi.hoisted(() => {
  const mockPgPoolEnd = vi.fn().mockResolvedValue(undefined);
  const MockPgPool = vi.fn().mockImplementation(function (this: {
    end: typeof mockPgPoolEnd;
  }) {
    this.end = mockPgPoolEnd;
  });
  return { mockPgPoolEnd, MockPgPool };
});

vi.mock('pg', () => ({
  default: { Pool: MockPgPool },
  Pool: MockPgPool,
}));

const { _mockPostgresSaverSetup, MockPostgresSaver } = vi.hoisted(() => {
  const _mockPostgresSaverSetup = vi.fn().mockResolvedValue(undefined);
  const MockPostgresSaver = vi.fn().mockImplementation(function (
    this: { setup: typeof _mockPostgresSaverSetup },
    _pool: unknown
  ) {
    this.setup = _mockPostgresSaverSetup;
  });
  return { _mockPostgresSaverSetup, MockPostgresSaver };
});

vi.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: MockPostgresSaver,
}));

vi.mock('@langchain/langgraph', () => {
  class MemorySaver {
    storage: Map<string, unknown> = new Map();
  }
  return { MemorySaver };
});

import { LangGraphService } from './langgraph.service';

function getPrivate<T>(svc: LangGraphService, field: string): T {
  return (svc as unknown as Record<string, T>)[field];
}

describe('LangGraphService - memory leak / teardown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['DATABASE_URL'];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env['DATABASE_URL'];
  });

  describe('onModuleDestroy() - pool.end()', () => {
    it('calls pool.end() when a PostgresSaver pool was created', async () => {
      process.env['DATABASE_URL'] = 'postgres://user:pw@localhost:5432/test';
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(mockPgPoolEnd).toHaveBeenCalledTimes(1);
    });

    it('does NOT call pool.end() when only MemorySaver was used', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(mockPgPoolEnd).not.toHaveBeenCalled();
    });

    it('sets pool to null after destroy', async () => {
      process.env['DATABASE_URL'] = 'postgres://user:pw@localhost:5432/test';
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(getPrivate(svc, 'pool')).toBeNull();
    });

    it('resolves without throwing when pool.end() rejects', async () => {
      process.env['DATABASE_URL'] = 'postgres://user:pw@localhost:5432/test';
      mockPgPoolEnd.mockRejectedValueOnce(new Error('pool already closed'));
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('sets checkpointer to null after destroy', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(getPrivate(svc, 'checkpointer')).toBeNull();
    });
  });

  describe('onModuleDestroy() - cleanup interval', () => {
    it('sets cleanupInterval to null after destroy', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(getPrivate(svc, 'cleanupInterval')).toBeNull();
    });

    it('cleanupInterval is non-null after onModuleInit() without DATABASE_URL', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      expect(getPrivate(svc, 'cleanupInterval')).not.toBeNull();
      await svc.onModuleDestroy();
    });

    it('does not leak timer - subsequent destroy calls are idempotent', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
      expect(getPrivate(svc, 'cleanupInterval')).toBeNull();
    });
  });

  describe('scheduleMemoryTrim() - session trimming', () => {
    it('trims MemorySaver storage to <=1000 when it exceeds the limit', async () => {
      vi.useFakeTimers();
      const svc = new LangGraphService();
      await svc.onModuleInit();

      const { MemorySaver } = await import('@langchain/langgraph');
      const checkpointer = svc.getCheckpointer();
      expect(checkpointer).toBeInstanceOf(MemorySaver);

      const storage = (
        checkpointer as unknown as { storage: Map<string, unknown> }
      ).storage;
      for (let i = 0; i < 1200; i++) {
        storage.set('session-' + String(i), { data: 'payload-' + String(i) });
      }
      expect(storage.size).toBe(1200);

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(storage.size).toBeLessThanOrEqual(1000);
      await svc.onModuleDestroy();
    });

    it('does NOT trim when sessions are within the limit', async () => {
      vi.useFakeTimers();
      const svc = new LangGraphService();
      await svc.onModuleInit();

      const checkpointer = svc.getCheckpointer();
      const storage = (
        checkpointer as unknown as { storage: Map<string, unknown> }
      ).storage;
      for (let i = 0; i < 500; i++) {
        storage.set('session-' + String(i), {});
      }

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(storage.size).toBe(500);
      await svc.onModuleDestroy();
    });

    it('trims oldest keys first (FIFO order)', async () => {
      vi.useFakeTimers();
      const svc = new LangGraphService();
      await svc.onModuleInit();

      const checkpointer = svc.getCheckpointer();
      const storage = (
        checkpointer as unknown as { storage: Map<string, unknown> }
      ).storage;
      for (let i = 0; i < 1050; i++) {
        storage.set('session-' + String(i), {});
      }

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      expect(storage.has('session-0')).toBe(false);
      expect(storage.has('session-49')).toBe(false);
      expect(storage.has('session-1049')).toBe(true);
      await svc.onModuleDestroy();
    });
  });

  describe('getCheckpointer() - pre-init guard', () => {
    it('throws when called before onModuleInit()', () => {
      const svc = new LangGraphService();
      expect(() => svc.getCheckpointer()).toThrow(
        'LangGraphService not initialized'
      );
    });

    it('throw message mentions onModuleInit()', () => {
      const svc = new LangGraphService();
      expect(() => svc.getCheckpointer()).toThrowError(
        /onModuleInit\(\) has not been called/
      );
    });

    it('does not throw after onModuleInit() completes', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      expect(() => svc.getCheckpointer()).not.toThrow();
      await svc.onModuleDestroy();
    });

    it('throws again after onModuleDestroy() clears the checkpointer', async () => {
      const svc = new LangGraphService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(() => svc.getCheckpointer()).toThrow(
        'LangGraphService not initialized'
      );
    });
  });
});

/**
 * Memory-safety tests for LangGraphService.
 *
 * Verifies:
 *  1. onModuleDestroy() calls clearInterval for the MemorySaver trim interval.
 *  2. onModuleDestroy() calls pool.end() when PostgresSaver is active.
 *  3. onModuleDestroy() sets checkpointer to null (releases reference).
 *  4. Multiple onModuleDestroy() calls do NOT call pool.end() twice.
 *  5. MemorySaver storage is evicted when size exceeds MAX_MEMORY_SAVER_SESSIONS.
 *  6. getCheckpointer() throws before onModuleInit() is called.
 *  7. getCheckpointer() returns the checkpointer after onModuleInit().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LangGraphService } from './langgraph.service';

// ── Mocks (via vi.hoisted so factories can reference them before const init) ──

const { mockPoolEnd, MockPool, mockSaverSetup, MockPostgresSaver, MockMemorySaver } =
  vi.hoisted(() => {
    const mockPoolEnd = vi.fn().mockResolvedValue(undefined);
    const mockSaverSetup = vi.fn().mockResolvedValue(undefined);
    // Regular function implementations (NOT arrow functions) so `new MockPool()` /
    // `new MockPostgresSaver()` works — Vitest calls `new impl()` internally, and
    // arrow functions are not constructors.
    const MockPool = vi.fn().mockImplementation(function PoolCtor() {
      return { end: mockPoolEnd };
    });
    const MockPostgresSaver = vi.fn().mockImplementation(function PostgresSaverCtor(
      _pool: unknown,
    ) {
      return { setup: mockSaverSetup };
    });
    class MockMemorySaver {
      storage = new Map<string, unknown>();
    }
    return { mockPoolEnd, MockPool, mockSaverSetup, MockPostgresSaver, MockMemorySaver };
  });

vi.mock('pg', () => ({ default: { Pool: MockPool } }));
vi.mock('@langchain/langgraph', () => ({ MemorySaver: MockMemorySaver }));
vi.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: MockPostgresSaver,
}));

describe('LangGraphService — memory safety', () => {
  let service: LangGraphService;
  let clearIntervalSpy: ReturnType<typeof vi.spyOn>;
  let setIntervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    setIntervalSpy = vi.spyOn(global, 'setInterval');

    mockPoolEnd.mockClear();
    mockSaverSetup.mockClear();
    MockPool.mockClear();
    MockPostgresSaver.mockClear();

    service = new LangGraphService();
  });

  afterEach(async () => {
    // Ensure resources are cleaned up even if a test forgot to call destroy
    await service.onModuleDestroy().catch(() => undefined);
    vi.useRealTimers();
    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('should call clearInterval on destroy when MemorySaver is active', async () => {
    // No DATABASE_URL → falls back to MemorySaver and schedules trim interval
    delete process.env.DATABASE_URL;

    await service.onModuleInit();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('should call pool.end() on destroy when PostgresSaver is active', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/edusphere';

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('should set checkpointer to null after destroy', async () => {
    delete process.env.DATABASE_URL;
    await service.onModuleInit();

    await service.onModuleDestroy();

    // After destroy, getCheckpointer() should throw
    expect(() => service.getCheckpointer()).toThrow('not initialized');
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('should NOT call pool.end() twice on double destroy', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/edusphere';

    await service.onModuleInit();
    await service.onModuleDestroy();
    await service.onModuleDestroy(); // second call — pool is already null

    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('should evict old sessions when MemorySaver storage exceeds 1000 entries', async () => {
    delete process.env.DATABASE_URL;
    await service.onModuleInit();

    const checkpointer = service.getCheckpointer() as unknown as { storage: Map<string, unknown> };
    // Populate 1050 sessions (50 over the limit)
    for (let i = 0; i < 1050; i++) {
      checkpointer.storage.set(`session-${i}`, { data: i });
    }
    expect(checkpointer.storage.size).toBe(1050);

    // Advance time to trigger the 5-minute cleanup interval
    vi.advanceTimersByTime(5 * 60 * 1000 + 100);

    // Should be trimmed back to 1000
    expect(checkpointer.storage.size).toBe(1000);
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('should throw from getCheckpointer() before onModuleInit()', () => {
    expect(() => service.getCheckpointer()).toThrow('LangGraphService not initialized');
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  it('should return a checkpointer after onModuleInit()', async () => {
    delete process.env.DATABASE_URL;
    await service.onModuleInit();

    const cp = service.getCheckpointer();

    expect(cp).toBeDefined();
    expect(cp).toBeInstanceOf(MockMemorySaver);
  });
});

/**
 * langgraph.service.memory.spec.ts
 *
 * Memory-safety tests for LangGraphService (supplementary to ai.langgraph.memory.spec.ts).
 * The existing ai.langgraph.memory.spec.ts is the primary suite covering pool teardown,
 * interval clearing, MemorySaver trimming, and getCheckpointer() guard.
 *
 * This file covers additional scenarios:
 *   1. clearInterval spy confirms the exact handle is passed.
 *   2. LRU eviction fires and keeps storage <= LANGGRAPH_MAX_MEMORY_SESSIONS.
 *   3. No leak: destroy called immediately after init (before any sessions) is safe.
 *   4. PostgresSaver path sets no cleanupInterval.
 *   5. PostgresSaver pool is ended and nullified on destroy.
 *   6. Oldest sessions are removed first (FIFO order) during LRU trim.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mocks — must precede all imports ────────────────────────────────────

const { mockPoolEnd, MockPgPool } = vi.hoisted(() => {
  const mockPoolEnd = vi.fn().mockResolvedValue(undefined);
  const MockPgPool = vi.fn().mockImplementation(function (
    this: { end: typeof mockPoolEnd },
  ) {
    this.end = mockPoolEnd;
  });
  return { mockPoolEnd, MockPgPool };
});

vi.mock('pg', () => ({
  default: { Pool: MockPgPool },
  Pool: MockPgPool,
}));

const { mockSetup, MockPostgresSaver } = vi.hoisted(() => {
  const mockSetup = vi.fn().mockResolvedValue(undefined);
  const MockPostgresSaver = vi.fn().mockImplementation(function (
    this: { setup: typeof mockSetup },
    _pool: unknown,
  ) {
    this.setup = mockSetup;
  });
  return { mockSetup, MockPostgresSaver };
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

// Mock constants — use literal values inside the factory (no top-level vars
// may be referenced inside vi.mock factories due to hoisting).
vi.mock('../constants.js', () => ({
  LANGGRAPH_MAX_MEMORY_SESSIONS: 1000,
  LANGGRAPH_CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
}));

// Test-local constants that mirror the mocked values — defined AFTER vi.mock calls
const MAX_SESSIONS = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

import { LangGraphService } from './langgraph.service.js';
import { MemorySaver } from '@langchain/langgraph';

function getPrivate<T>(svc: LangGraphService, field: string): T {
  return (svc as unknown as Record<string, T>)[field];
}

describe('LangGraphService — memory safety (supplementary)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['DATABASE_URL'];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env['DATABASE_URL'];
  });

  // ── Test 1: clearInterval receives the exact handle stored on the service ──
  it('calls clearInterval with the exact cleanupInterval handle', async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const svc = new LangGraphService();
    await svc.onModuleInit();

    const handle = getPrivate<ReturnType<typeof setInterval>>(svc, 'cleanupInterval');
    expect(handle).not.toBeNull();

    await svc.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(handle);
    clearIntervalSpy.mockRestore();
  });

  // ── Test 2: LRU trim keeps storage <= LANGGRAPH_MAX_MEMORY_SESSIONS ────────
  it('LRU eviction fires and keeps MemorySaver storage <= MAX_SESSIONS', async () => {
    vi.useFakeTimers();
    const svc = new LangGraphService();
    await svc.onModuleInit();

    const checkpointer = svc.getCheckpointer();
    expect(checkpointer).toBeInstanceOf(MemorySaver);

    const storage = (checkpointer as unknown as { storage: Map<string, unknown> }).storage;
    const overLimit = MAX_SESSIONS + 150;

    for (let i = 0; i < overLimit; i++) {
      storage.set(`thread-${String(i)}`, { state: i });
    }
    expect(storage.size).toBe(overLimit);

    vi.advanceTimersByTime(CLEANUP_INTERVAL_MS + 1);

    expect(storage.size).toBeLessThanOrEqual(MAX_SESSIONS);
    await svc.onModuleDestroy();
  });

  // ── Test 3: Destroy immediately after init (no sessions added) is safe ─────
  it('onModuleDestroy() is safe when no sessions have been added yet', async () => {
    const svc = new LangGraphService();
    await svc.onModuleInit();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect(getPrivate(svc, 'cleanupInterval')).toBeNull();
    expect(getPrivate(svc, 'checkpointer')).toBeNull();
  });

  // ── Test 4: PostgresSaver path — no cleanupInterval is set ────────────────
  it('does not set a cleanupInterval when PostgresSaver is used', async () => {
    process.env['DATABASE_URL'] = 'postgres://user:pw@localhost:5432/edusphere_test';

    const svc = new LangGraphService();
    await svc.onModuleInit();

    // When PostgresSaver succeeds, scheduleMemoryTrim() is NOT called
    expect(getPrivate(svc, 'cleanupInterval')).toBeNull();

    await svc.onModuleDestroy();
  });

  // ── Test 5: PostgresSaver pool is ended and pool field is null after destroy
  it('ends the PostgreSQL pool and nullifies the pool reference on destroy', async () => {
    process.env['DATABASE_URL'] = 'postgres://user:pw@localhost:5432/edusphere_test';

    const svc = new LangGraphService();
    await svc.onModuleInit();
    expect(getPrivate(svc, 'pool')).not.toBeNull();

    await svc.onModuleDestroy();

    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    expect(getPrivate(svc, 'pool')).toBeNull();
  });

  // ── Test 6: Oldest sessions are removed first (insertion-order FIFO) ───────
  it('removes oldest sessions first during LRU trim', async () => {
    vi.useFakeTimers();
    const svc = new LangGraphService();
    await svc.onModuleInit();

    const checkpointer = svc.getCheckpointer();
    const storage = (checkpointer as unknown as { storage: Map<string, unknown> }).storage;

    const total = MAX_SESSIONS + 50;
    for (let i = 0; i < total; i++) {
      storage.set(`sess-${String(i)}`, { index: i });
    }

    vi.advanceTimersByTime(CLEANUP_INTERVAL_MS + 1);

    // First 50 entries (oldest) should have been evicted
    expect(storage.has('sess-0')).toBe(false);
    expect(storage.has('sess-49')).toBe(false);
    // Most recent entries should still be present
    expect(storage.has(`sess-${String(total - 1)}`)).toBe(true);

    await svc.onModuleDestroy();
  });
});

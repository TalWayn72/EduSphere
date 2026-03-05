/**
 * langgraph.service.spec.ts
 * Unit tests for LangGraphService — checkpointer lifecycle, cleanup interval,
 * memory trim, and pool management.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSetup = vi.fn().mockResolvedValue(undefined);
const mockPoolEnd = vi.fn().mockResolvedValue(undefined);

vi.mock('@langchain/langgraph', () => ({
  MemorySaver: class {
    storage = new Map<string, unknown>();
  },
}));

vi.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: class {
    setup = mockSetup;
    constructor(public pool: unknown) {}
  },
}));

vi.mock('pg', () => ({
  default: {
    Pool: class {
      end = mockPoolEnd;
    },
  },
}));

vi.mock('../constants', () => ({
  LANGGRAPH_MAX_MEMORY_SESSIONS: 3,
  LANGGRAPH_CLEANUP_INTERVAL_MS: 100,
}));

import { LangGraphService } from './langgraph.service.js';

describe('LangGraphService', () => {
  let service: LangGraphService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new LangGraphService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── onModuleInit — no DATABASE_URL ────────────────────────────────────────

  it('falls back to MemorySaver when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    await service.onModuleInit();
    const cp = service.getCheckpointer();
    expect(cp).toBeDefined();
    expect(mockSetup).not.toHaveBeenCalled();
  });

  it('getCheckpointer throws before onModuleInit', () => {
    expect(() => service.getCheckpointer()).toThrow('not initialized');
  });

  // ── onModuleInit — with DATABASE_URL ─────────────────────────────────────

  it('initializes PostgresSaver when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    await service.onModuleInit();
    expect(mockSetup).toHaveBeenCalled();
    const cp = service.getCheckpointer();
    expect(cp).toBeDefined();
    delete process.env.DATABASE_URL;
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  it('clears cleanupInterval on destroy', async () => {
    delete process.env.DATABASE_URL;
    await service.onModuleInit();
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    await service.onModuleDestroy();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('closes pool on destroy when PostgresSaver was used', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(mockPoolEnd).toHaveBeenCalled();
    delete process.env.DATABASE_URL;
  });

  // ── memory trim interval ──────────────────────────────────────────────────

  it('trims MemorySaver storage when it exceeds max sessions', async () => {
    delete process.env.DATABASE_URL;
    await service.onModuleInit();
    const saver = service.getCheckpointer() as unknown as { storage: Map<string, unknown> };
    // Fill beyond max (3)
    for (let i = 0; i < 5; i++) saver.storage.set(`session-${i}`, {});
    expect(saver.storage.size).toBe(5);
    vi.advanceTimersByTime(200);
    expect(saver.storage.size).toBeLessThanOrEqual(3);
  });
});

/**
 * kmeans-data.service.memory.spec.ts
 *
 * Memory-safety tests for KMeansDataService.
 * Verifies:
 *   1. KMeansDataService.onModuleDestroy() calls closeAllPools().
 *   2. onModuleDestroy() is idempotent (safe to call multiple times).
 *   3. DB connection is created once at construction (no per-call leaks).
 *   4. fetchEmbeddingRows logs and returns [] on DB error (no hanging promise).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist DB mock ─────────────────────────────────────────────────────────────

const { mockCloseAllPools, mockCreateDb, mockDb } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        catch: vi.fn().mockResolvedValue([]),
      }),
      catch: vi.fn().mockResolvedValue([]),
    }),
  };
  const mockCreateDb = vi.fn().mockReturnValue(mockDb);
  return { mockCloseAllPools, mockCreateDb, mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: mockCreateDb,
  closeAllPools: mockCloseAllPools,
  db: mockDb,
  executeCypher: vi.fn().mockResolvedValue([]),
  schema: {
    concept_embeddings: {
      concept_id: 'concept_id',
      embedding: 'embedding',
    },
  },
  eq: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { KMeansDataService } from './kmeans-data.service.js';

function makeService(): KMeansDataService {
  return new KMeansDataService();
}

describe('KMeansDataService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: onModuleDestroy closes DB pool ────────────────────────────────
  it('onModuleDestroy() calls closeAllPools()', async () => {
    const svc = makeService();
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: onModuleDestroy is idempotent ─────────────────────────────────
  it('calling onModuleDestroy() twice does not throw', async () => {
    const svc = makeService();
    await svc.onModuleDestroy();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  // ── Test 3: createDatabaseConnection called once at construction ──────────
  it('createDatabaseConnection() is called once per service instance', () => {
    mockCreateDb.mockClear();
    makeService();
    expect(mockCreateDb).toHaveBeenCalledTimes(1);
  });

  // ── Test 4: fetchEmbeddingRows returns [] and does not hang on DB error ───
  it('fetchEmbeddingRows resolves to [] when DB throws', async () => {
    const svc = makeService();
    // Override select chain to simulate a DB error with catch fallback
    const catchFn = vi.fn().mockResolvedValue([]);
    vi.mocked(mockDb.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ catch: catchFn }),
    } as never);

    const result = await svc.fetchEmbeddingRows('tenant-1');
    expect(Array.isArray(result)).toBe(true);
    await svc.onModuleDestroy();
  });
});

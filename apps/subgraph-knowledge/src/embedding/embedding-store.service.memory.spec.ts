/**
 * embedding-store.service.memory.spec.ts
 *
 * Memory-safety tests for EmbeddingStoreService (standalone).
 * Verifies:
 *   1. EmbeddingStoreService.onModuleDestroy() calls closeAllPools().
 *   2. onModuleDestroy() is idempotent (safe to call multiple times).
 *   3. createDatabaseConnection() is called exactly once at construction.
 *   4. delete() resolves to false gracefully when all tables return empty results
 *      (no hanging promises or unresolved DB calls).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist DB mock ─────────────────────────────────────────────────────────────

const { mockCloseAllPools, mockCreateDb, mockDb } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  };
  const mockCreateDb = vi.fn().mockReturnValue(mockDb);
  return { mockCloseAllPools, mockCreateDb, mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: mockCreateDb,
  closeAllPools: mockCloseAllPools,
  schema: {
    content_embeddings: {
      id: 'id',
      segment_id: 'segment_id',
      embedding: 'embedding',
    },
    annotation_embeddings: {
      id: 'id',
      annotation_id: 'annotation_id',
      embedding: 'embedding',
    },
    concept_embeddings: {
      id: 'id',
      concept_id: 'concept_id',
      embedding: 'embedding',
    },
    transcript_segments: {
      id: 'id',
      text: 'text',
    },
  },
  eq: vi.fn(),
  sql: vi.fn(),
}));

import { EmbeddingStoreService } from './embedding-store.service.js';

function makeService(): EmbeddingStoreService {
  return new EmbeddingStoreService();
}

describe('EmbeddingStoreService — memory safety', () => {
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
  it('calling onModuleDestroy() twice does not throw and calls closeAllPools() each time', async () => {
    const svc = makeService();
    await svc.onModuleDestroy();
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  // ── Test 3: createDatabaseConnection called once at construction ──────────
  it('createDatabaseConnection() is called exactly once per service instance', () => {
    mockCreateDb.mockClear();
    makeService();
    expect(mockCreateDb).toHaveBeenCalledTimes(1);
  });

  // ── Test 4: delete() resolves to false without hanging when record not found ──
  it('delete() resolves to false when no matching record exists in any table', async () => {
    // All three delete chains return empty arrays (record not found)
    vi.mocked(mockDb.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    } as never);

    const svc = makeService();
    const result = await svc.delete('non-existent-id');
    expect(result).toBe(false);
    await svc.onModuleDestroy();
  });
});

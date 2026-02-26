/**
 * embedding.service.memory.spec.ts
 *
 * Memory-safety tests for EmbeddingService + EmbeddingStoreService.
 * Verifies:
 *   1. EmbeddingStoreService.onModuleDestroy() calls closeAllPools().
 *   2. generateBatchEmbeddings processes exactly BATCH_SIZE items per tick
 *      (no unbounded in-flight accumulation).
 *   3. Provider errors during batch do not cause unhandled rejections — the
 *      service logs and continues (no growing error queue).
 *   4. semanticSearch falls back to ILIKE when hasProvider() returns false
 *      (no provider connection retained unnecessarily).
 *   5. EmbeddingStoreService.onModuleDestroy() is idempotent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist DB mock ─────────────────────────────────────────────────────────────

const { mockCloseAllPools, mockDb } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  };
  return { mockCloseAllPools, mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: mockCloseAllPools,
  schema: {
    content_embeddings: { id: 'id', segment_id: 'segment_id' },
    annotation_embeddings: { id: 'id', annotation_id: 'annotation_id' },
    concept_embeddings: { id: 'id', concept_id: 'concept_id' },
    transcript_segments: { id: 'id', text: 'text' },
  },
  eq: vi.fn(),
  sql: vi.fn(),
}));

import { EmbeddingStoreService } from './embedding-store.service.js';
import { EmbeddingProviderService } from './embedding-provider.service.js';
import { EmbeddingService } from './embedding.service.js';

function makeServices() {
  const store = new EmbeddingStoreService();
  const provider = new EmbeddingProviderService();
  const svc = new EmbeddingService(store, provider);
  return { store, provider, svc };
}

describe('EmbeddingService / EmbeddingStoreService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // ── Test 1: onModuleDestroy closes DB pool ────────────────────────────────
  it('EmbeddingStoreService.onModuleDestroy() calls closeAllPools()', async () => {
    const { store } = makeServices();
    await store.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: batch processes in chunks of BATCH_SIZE (20) ─────────────────
  it('generateBatchEmbeddings sends at most BATCH_SIZE=20 concurrent requests', async () => {
    vi.stubEnv('OLLAMA_URL', 'http://localhost:11434');

    let maxConcurrent = 0;
    let inFlight = 0;

    const mockFetch = vi.fn().mockImplementation(async () => {
      inFlight++;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      await Promise.resolve();
      inFlight--;
      return {
        ok: true,
        json: async () => ({ embedding: new Array(768).fill(0.1) }),
      };
    });

    vi.stubGlobal('fetch', mockFetch);

    const { svc, store } = makeServices();
    mockDb.execute.mockResolvedValue([
      {
        id: 'emb-1',
        segment_id: 'seg-1',
        embedding: [],
        created_at: new Date(),
      },
    ]);

    const segments = Array.from({ length: 45 }, (_, i) => ({
      id: `seg-${i}`,
      text: `text ${i}`,
      transcriptId: 'tr-1',
    }));
    await svc.generateBatchEmbeddings(segments);

    expect(maxConcurrent).toBeLessThanOrEqual(20);
    await store.onModuleDestroy();
  });

  // ── Test 3: provider errors during batch are caught, not accumulated ──────
  it('batch does not accumulate unhandled rejections when provider throws', async () => {
    vi.stubEnv('OLLAMA_URL', 'http://localhost:11434');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );

    const { svc, store } = makeServices();
    const segments = [
      { id: 's1', text: 'fail text', transcriptId: 'tr-1' },
      { id: 's2', text: 'fail text 2', transcriptId: 'tr-1' },
    ];

    // Should resolve without throwing — errors logged, not re-thrown
    await expect(svc.generateBatchEmbeddings(segments)).resolves.toBe(0);
    await store.onModuleDestroy();
  });

  // ── Test 4: no provider retained when hasProvider() is false ─────────────
  it('semanticSearch uses ILIKE fallback when no provider env is set', async () => {
    // No OLLAMA_URL, no OPENAI_API_KEY → hasProvider() = false
    const mockIlike = vi
      .spyOn(EmbeddingStoreService.prototype, 'ilikeFallback')
      .mockResolvedValue([]);
    const { svc, store } = makeServices();

    await svc.semanticSearch('graph theory', 'tenant-1', 5);

    expect(mockIlike).toHaveBeenCalledWith('graph theory', 5);
    mockIlike.mockRestore();
    await store.onModuleDestroy();
  });

  // ── Test 5: onModuleDestroy is idempotent ─────────────────────────────────
  it('calling EmbeddingStoreService.onModuleDestroy() twice does not throw', async () => {
    const { store } = makeServices();
    await store.onModuleDestroy();
    await expect(store.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });
});

/**
 * content-item.loader.memory.spec.ts
 *
 * Memory-safety tests for ContentItemLoader.
 * Verifies:
 *   1. DataLoader is constructed with cache:false so it creates no growing
 *      per-instance cache — each key lookup always goes to the batch function.
 *   2. A fresh loader can be constructed per request without accumulating state.
 *   3. Batch function delegates to ContentItemService and returns results in
 *      the same order as the input keys (DataLoader contract).
 *   4. Unknown moduleIds return empty arrays (no retained state from prior calls).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ContentItemService ───────────────────────────────────────────────────

const mockFindByModuleIdBatch = vi.fn();

vi.mock('./content-item.service.js', () => ({
  ContentItemService: vi.fn().mockImplementation(function () {
    return { findByModuleIdBatch: mockFindByModuleIdBatch };
  }),
}));

// DataLoader is NOT mocked — we exercise the real constructor options.
import { ContentItemLoader } from './content-item.loader.js';
import { ContentItemService } from './content-item.service.js';

function makeLoader(): ContentItemLoader {
  const svc = new ContentItemService(null as never);
  return new ContentItemLoader(svc);
}

describe('ContentItemLoader — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: cache:false prevents accumulated cache entries ────────────────
  it('constructs DataLoader with cache:false (no growing per-instance cache)', () => {
    const loader = makeLoader();
    // Access the internal DataLoader options via the known property name.
    // DataLoader exposes _cacheMap only when caching is enabled.
    // With cache:false the map is never populated even after loads.
    const dl = loader.byModuleId as unknown as {
      _cacheMap: Map<unknown, unknown> | undefined;
    };
    // cache:false means _cacheMap is undefined or null
    expect(dl._cacheMap == null).toBe(true);
  });

  // ── Test 2: creating multiple loaders does not share state ─────────────────
  it('each loader instance is independent — no shared mutable state', () => {
    const loaderA = makeLoader();
    const loaderB = makeLoader();
    expect(loaderA.byModuleId).not.toBe(loaderB.byModuleId);
  });

  // ── Test 3: batch function passes keys to the service ────────────────────
  it('batch function delegates to ContentItemService.findByModuleIdBatch', async () => {
    const batchMap = new Map([
      ['mod-1', [{ id: 'ci-1' }]],
      ['mod-2', []],
    ]);
    mockFindByModuleIdBatch.mockResolvedValue(batchMap);

    const loader = makeLoader();
    // Load individually — DataLoader batches them in one tick.
    const [r1, r2] = await Promise.all([
      loader.byModuleId.load('mod-1'),
      loader.byModuleId.load('mod-2'),
    ]);

    expect(mockFindByModuleIdBatch).toHaveBeenCalledTimes(1);
    expect(mockFindByModuleIdBatch).toHaveBeenCalledWith(['mod-1', 'mod-2']);
    expect(r1).toEqual([{ id: 'ci-1' }]);
    expect(r2).toEqual([]);
  });

  // ── Test 4: unknown keys return [] without retaining state ────────────────
  it('returns empty array for unknown moduleId — no residual accumulation', async () => {
    mockFindByModuleIdBatch.mockResolvedValue(new Map());

    const loader = makeLoader();
    const result = await loader.byModuleId.load('missing-mod');

    expect(result).toEqual([]);
    // Second call to a different loader uses a fresh batch state
    mockFindByModuleIdBatch.mockResolvedValue(new Map());
    const loader2 = makeLoader();
    const result2 = await loader2.byModuleId.load('missing-mod');
    expect(result2).toEqual([]);
    expect(mockFindByModuleIdBatch).toHaveBeenCalledTimes(2);
  });

  // ── Test 5: results are returned in the same order as input keys ──────────
  it('preserves input key order in batch results (DataLoader contract)', async () => {
    const batchMap = new Map([
      ['mod-b', [{ id: 'ci-b' }]],
      ['mod-a', [{ id: 'ci-a' }]],
    ]);
    mockFindByModuleIdBatch.mockResolvedValue(batchMap);

    const loader = makeLoader();
    const [ra, rb] = await Promise.all([
      loader.byModuleId.load('mod-a'),
      loader.byModuleId.load('mod-b'),
    ]);

    expect(ra).toEqual([{ id: 'ci-a' }]);
    expect(rb).toEqual([{ id: 'ci-b' }]);
  });
});

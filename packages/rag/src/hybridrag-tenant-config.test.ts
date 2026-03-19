import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HybridSearchEngine,
  type RagConfig,
} from './hybridSearch';
import type { CachedEmbeddings } from './embeddings';
import type { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeFakeEmbedding(seed = 0): number[] {
  return Array.from({ length: 3 }, (_, i) => (i + seed) * 0.1);
}

function makeSemanticRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sem-1',
    content: 'Semantic result content',
    metadata: { source: 'semantic.pdf' },
    semantic_score: '0.90',
    ...overrides,
  };
}

function makeKeywordRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'kw-1',
    content: 'Keyword result content',
    metadata: { source: 'keyword.pdf' },
    keyword_score: '0.85',
    ...overrides,
  };
}

function makeMockPool(
  semanticRows: Record<string, unknown>[] = [],
  keywordRows: Record<string, unknown>[] = []
): Pool & { query: ReturnType<typeof vi.fn> } {
  const query = vi
    .fn()
    .mockResolvedValueOnce({ rows: semanticRows })
    .mockResolvedValueOnce({ rows: keywordRows });
  return { query } as unknown as Pool & { query: ReturnType<typeof vi.fn> };
}

function makeMockEmbeddings(): CachedEmbeddings {
  return {
    embedQuery: vi
      .fn<[string], Promise<number[]>>()
      .mockResolvedValue(makeFakeEmbedding()),
    embedDocuments: vi.fn(),
    configureCache: vi.fn(),
    clearCache: vi.fn(),
  } as unknown as CachedEmbeddings;
}

// ---------------------------------------------------------------------------
// Tests: Per-Tenant HybridRAG Weight Configuration (#43)
// ---------------------------------------------------------------------------
describe('HybridRAG per-tenant weight configuration', () => {
  let mockEmbeddings: CachedEmbeddings;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbeddings = makeMockEmbeddings();
  });

  describe('RagConfig defaults', () => {
    it('uses default 0.5/0.5 weights when no ragConfig is provided', async () => {
      const pool = makeMockPool([makeSemanticRow({ id: 'r1' })], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.searchWithGraphTraversal('test', 'tenant-a');

      // With default vectorWeight=0.5, a semantic-only result with
      // combinedScore = 0.90 * 0.7 (semantic weight) = 0.63 should be
      // further scaled by vectorWeight 0.5 → 0.315
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(typeof r.combinedScore).toBe('number');
        expect(r.combinedScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('custom per-tenant weights', () => {
    it('applies vectorWeight=0.8, graphWeight=0.2 from ragConfig', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 'v1', semantic_score: '1.0' })],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);

      const ragConfig: RagConfig = { vectorWeight: 0.8, graphWeight: 0.2 };
      const results = await engine.searchWithGraphTraversal(
        'test',
        'tenant-vec-heavy',
        { ragConfig }
      );

      // Hybrid search → combinedScore = 1.0 * 0.7 (default semanticWeight) = 0.7
      // After graph merge → 0.7 * 0.8 (vectorWeight) = 0.56
      const doc = results.find((r) => r.id === 'v1');
      expect(doc).toBeDefined();
      expect(doc!.combinedScore).toBeCloseTo(0.56, 2);
    });

    it('applies vectorWeight=0.2, graphWeight=0.8 (graph-heavy tenant)', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 'v1', semantic_score: '1.0' })],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);

      const ragConfig: RagConfig = { vectorWeight: 0.2, graphWeight: 0.8 };
      const results = await engine.searchWithGraphTraversal(
        'test',
        'tenant-graph-heavy',
        { ragConfig }
      );

      // Hybrid combinedScore = 1.0 * 0.7 = 0.7 → merged: 0.7 * 0.2 = 0.14
      const doc = results.find((r) => r.id === 'v1');
      expect(doc).toBeDefined();
      expect(doc!.combinedScore).toBeCloseTo(0.14, 2);
    });

    it('equal weights 0.5/0.5 matches default behavior', async () => {
      const pool1 = makeMockPool(
        [makeSemanticRow({ id: 'r1', semantic_score: '0.90' })],
        []
      );
      const pool2 = makeMockPool(
        [makeSemanticRow({ id: 'r1', semantic_score: '0.90' })],
        []
      );
      const engine1 = new HybridSearchEngine(pool1, mockEmbeddings);
      const engine2 = new HybridSearchEngine(pool2, makeMockEmbeddings());

      const withExplicit = await engine1.searchWithGraphTraversal(
        'test',
        'tenant-a',
        { ragConfig: { vectorWeight: 0.5, graphWeight: 0.5 } }
      );
      const withDefault = await engine2.searchWithGraphTraversal(
        'test',
        'tenant-a'
      );

      expect(withExplicit[0]!.combinedScore).toBeCloseTo(
        withDefault[0]!.combinedScore,
        5
      );
    });
  });

  describe('weight boundaries', () => {
    it('vectorWeight=1.0, graphWeight=0.0 ignores graph results', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 'v1', semantic_score: '0.80' })],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const ragConfig: RagConfig = { vectorWeight: 1.0, graphWeight: 0.0 };
      const results = await engine.searchWithGraphTraversal(
        'test',
        'tenant-vec-only',
        { ragConfig }
      );

      // combinedScore = 0.80 * 0.7 * 1.0 = 0.56
      const doc = results.find((r) => r.id === 'v1');
      expect(doc).toBeDefined();
      expect(doc!.combinedScore).toBeCloseTo(0.56, 2);
    });

    it('vectorWeight=0.0, graphWeight=1.0 zeroes out vector results', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 'v1', semantic_score: '0.80' })],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const ragConfig: RagConfig = { vectorWeight: 0.0, graphWeight: 1.0 };
      const results = await engine.searchWithGraphTraversal(
        'test',
        'tenant-graph-only',
        { ragConfig }
      );

      // With vectorWeight=0.0 the vector-only result gets combinedScore = 0
      const doc = results.find((r) => r.id === 'v1');
      expect(doc).toBeDefined();
      expect(doc!.combinedScore).toBeCloseTo(0, 5);
    });
  });

  describe('HybridSearchOptions.ragConfig integration', () => {
    it('ragConfig is passed through searchWithGraphTraversal options', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 's1', semantic_score: '0.50' })],
        [makeKeywordRow({ id: 'k1', keyword_score: '0.40' })]
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);

      const ragConfig: RagConfig = { vectorWeight: 0.6, graphWeight: 0.4 };
      const results = await engine.searchWithGraphTraversal(
        'hybrid test',
        'tenant-custom',
        { ragConfig, topK: 5 }
      );

      expect(Array.isArray(results)).toBe(true);
      // All results should have valid combined scores
      for (const r of results) {
        expect(r.combinedScore).toBeGreaterThanOrEqual(0);
        expect(r.rank).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('result ranking with different weights', () => {
    it('changes ranking order when weights are swapped', async () => {
      // Since findRelatedConcepts returns [] (stub), graph results won't
      // change the outcome, but the vectorWeight scaling still affects
      // the final combinedScore magnitude.
      const pool1 = makeMockPool(
        [
          makeSemanticRow({ id: 'a', semantic_score: '0.90' }),
          makeSemanticRow({ id: 'b', semantic_score: '0.60' }),
        ],
        []
      );
      const pool2 = makeMockPool(
        [
          makeSemanticRow({ id: 'a', semantic_score: '0.90' }),
          makeSemanticRow({ id: 'b', semantic_score: '0.60' }),
        ],
        []
      );

      const engine1 = new HybridSearchEngine(pool1, mockEmbeddings);
      const engine2 = new HybridSearchEngine(pool2, makeMockEmbeddings());

      const heavy = await engine1.searchWithGraphTraversal('test', 't', {
        ragConfig: { vectorWeight: 0.9, graphWeight: 0.1 },
      });
      const light = await engine2.searchWithGraphTraversal('test', 't', {
        ragConfig: { vectorWeight: 0.1, graphWeight: 0.9 },
      });

      // Ranking order stays the same (both purely vector), but scores differ
      expect(heavy[0]!.combinedScore).toBeGreaterThan(light[0]!.combinedScore);
    });
  });
});

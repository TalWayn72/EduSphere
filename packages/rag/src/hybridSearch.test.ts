import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HybridSearchEngine,
  createHybridSearch,
  HybridSearchResult,
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
// Tests
// ---------------------------------------------------------------------------
describe('HybridSearchEngine', () => {
  let mockEmbeddings: CachedEmbeddings;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbeddings = makeMockEmbeddings();
  });

  describe('constructor and factory', () => {
    it('creates HybridSearchEngine instance', () => {
      const pool = makeMockPool();
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      expect(engine).toBeInstanceOf(HybridSearchEngine);
    });

    it('factory createHybridSearch returns HybridSearchEngine', () => {
      const pool = makeMockPool();
      const engine = createHybridSearch(pool, mockEmbeddings);
      expect(engine).toBeInstanceOf(HybridSearchEngine);
    });

    it('factory accepts custom tableName', () => {
      const pool = makeMockPool();
      const engine = createHybridSearch(pool, mockEmbeddings, 'custom_vectors');
      expect(engine).toBeInstanceOf(HybridSearchEngine);
    });
  });

  describe('search() — full hybrid pipeline', () => {
    it('embeds the query for semantic search', async () => {
      const pool = makeMockPool([makeSemanticRow()], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('machine learning', 'tenant-abc');

      expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith(
        'machine learning'
      );
    });

    it('runs exactly 2 DB queries (semantic + keyword)', async () => {
      const pool = makeMockPool([makeSemanticRow()], [makeKeywordRow()]);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('test query', 'tenant-abc');

      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('returns results with combinedScore field', async () => {
      const pool = makeMockPool([makeSemanticRow()], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      for (const r of results) {
        expect(typeof r.combinedScore).toBe('number');
      }
    });

    it('returns results with rank field (1-indexed)', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 'r1' }), makeSemanticRow({ id: 'r2' })],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      expect(results[0]!.rank).toBe(1);
      if (results.length > 1) {
        expect(results[1]!.rank).toBe(2);
      }
    });

    it('respects topK option and limits results', async () => {
      const rows = Array.from({ length: 20 }, (_, i) =>
        makeSemanticRow({ id: `r${i}`, semantic_score: String(0.9 - i * 0.01) })
      );
      const pool = makeMockPool(rows, []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc', { topK: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('results are sorted by combinedScore descending', async () => {
      const pool = makeMockPool(
        [
          makeSemanticRow({ id: 'high', semantic_score: '0.95' }),
          makeSemanticRow({ id: 'low', semantic_score: '0.60' }),
        ],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      expect(results[0]!.id).toBe('high');
      expect(results[1]!.id).toBe('low');
    });

    it('tenantId is used as a query parameter for both DB calls', async () => {
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('test', 'tenant-42');

      const allParams = (pool.query as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[1] as unknown[]
      );
      expect(allParams.every((params) => params.includes('tenant-42'))).toBe(
        true
      );
    });

    it('uses default semanticWeight=0.7 for semantic-only result', async () => {
      const pool = makeMockPool(
        [makeSemanticRow({ id: 'sem-only', semantic_score: '1.0' })],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      // semantic-only doc: combinedScore = 1.0 * 0.7 = 0.7
      const sem = results.find((r) => r.id === 'sem-only');
      expect(sem!.combinedScore).toBeCloseTo(0.7);
    });

    it('deduplicates results that appear in both semantic and keyword searches', async () => {
      const sharedId = 'overlap-doc';
      const pool = makeMockPool(
        [makeSemanticRow({ id: sharedId, semantic_score: '0.80' })],
        [makeKeywordRow({ id: sharedId, keyword_score: '0.70' })]
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('combines scores when same doc appears in both channels', async () => {
      const sharedId = 'combined-doc';
      const pool = makeMockPool(
        [makeSemanticRow({ id: sharedId, semantic_score: '0.80' })],
        [makeKeywordRow({ id: sharedId, keyword_score: '0.60' })]
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      const combined = results.find((r) => r.id === sharedId);
      // combinedScore = 0.80 * 0.7 + 0.60 * 0.3 = 0.56 + 0.18 = 0.74
      expect(combined!.combinedScore).toBeCloseTo(0.74);
    });

    it('returns empty array when no results from either channel', async () => {
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('no match', 'tenant-abc');

      expect(results).toHaveLength(0);
    });

    it('includes results from keyword-only channel', async () => {
      const pool = makeMockPool([], [makeKeywordRow({ id: 'kw-only' })]);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('keyword query', 'tenant-abc');

      expect(results.some((r) => r.id === 'kw-only')).toBe(true);
    });
  });

  describe('semantic search channel', () => {
    it('uses vector cosine distance operator <=> in the query', async () => {
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('test', 'tenant-abc');

      const semanticQuery = String(
        (pool.query as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      );
      expect(semanticQuery).toContain('<=>');
    });

    it('passes embedding as JSON-stringified vector parameter', async () => {
      const fakeEmb = makeFakeEmbedding(7);
      vi.mocked(mockEmbeddings.embedQuery).mockResolvedValue(fakeEmb);
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('test', 'tenant-abc');

      const params = (pool.query as ReturnType<typeof vi.fn>).mock
        .calls[0]![1] as unknown[];
      expect(params[0]).toBe(JSON.stringify(fakeEmb));
    });
  });

  describe('keyword search channel', () => {
    it('uses PostgreSQL full-text search function ts_rank', async () => {
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('test query', 'tenant-abc');

      const keywordQuery = String(
        (pool.query as ReturnType<typeof vi.fn>).mock.calls[1]![0]
      );
      expect(keywordQuery).toContain('ts_rank');
    });

    it('passes query text as parameter for full-text search', async () => {
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      await engine.search('machine learning', 'tenant-abc');

      const params = (pool.query as ReturnType<typeof vi.fn>).mock
        .calls[1]![1] as unknown[];
      expect(params[0]).toBe('machine learning');
    });
  });

  describe('searchWithGraphTraversal()', () => {
    it('returns HybridSearchResult array', async () => {
      const pool = makeMockPool([makeSemanticRow()], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.searchWithGraphTraversal(
        'quantum computing',
        'tenant-abc'
      );

      expect(Array.isArray(results)).toBe(true);
    });

    it('graph traversal preserves results from hybrid search', async () => {
      const pool = makeMockPool([makeSemanticRow({ id: 'base-result' })], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.searchWithGraphTraversal(
        'test',
        'tenant-abc'
      );

      expect(results.some((r) => r.id === 'base-result')).toBe(true);
    });

    it('results have rank re-applied after graph merge starting from 1', async () => {
      const pool = makeMockPool(
        [
          makeSemanticRow({ id: 'r1', semantic_score: '0.9' }),
          makeSemanticRow({ id: 'r2', semantic_score: '0.7' }),
        ],
        []
      );
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.searchWithGraphTraversal(
        'test',
        'tenant-abc'
      );

      const minRank = Math.min(...results.map((r) => r.rank));
      expect(minRank).toBe(1);
    });

    it('returns empty array when no hybrid results found', async () => {
      const pool = makeMockPool([], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.searchWithGraphTraversal(
        'obscure',
        'tenant-abc'
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('propagates embedding error', async () => {
      vi.mocked(mockEmbeddings.embedQuery).mockRejectedValue(
        new Error('OpenAI embedding failed')
      );
      const pool = { query: vi.fn() } as unknown as Pool;
      const engine = new HybridSearchEngine(pool, mockEmbeddings);

      await expect(engine.search('test', 'tenant-abc')).rejects.toThrow(
        'OpenAI embedding failed'
      );
    });

    it('propagates DB error from semantic search', async () => {
      const pool = {
        query: vi.fn().mockRejectedValue(new Error('PG connection refused')),
      } as unknown as Pool;
      const engine = new HybridSearchEngine(pool, mockEmbeddings);

      await expect(engine.search('test', 'tenant-abc')).rejects.toThrow(
        'PG connection refused'
      );
    });
  });

  describe('HybridSearchResult structure', () => {
    it('result includes semanticScore, keywordScore, combinedScore, rank fields', async () => {
      const pool = makeMockPool([makeSemanticRow()], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      const r: HybridSearchResult = results[0]!;
      expect(typeof r.semanticScore).toBe('number');
      expect(typeof r.keywordScore).toBe('number');
      expect(typeof r.combinedScore).toBe('number');
      expect(typeof r.rank).toBe('number');
    });

    it('keyword-only results have semanticScore=0', async () => {
      const pool = makeMockPool([], [makeKeywordRow({ id: 'kw-only' })]);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      const kwResult = results.find((r) => r.id === 'kw-only');
      expect(kwResult!.semanticScore).toBe(0);
    });

    it('semantic-only results have keywordScore=0', async () => {
      const pool = makeMockPool([makeSemanticRow({ id: 'sem-only' })], []);
      const engine = new HybridSearchEngine(pool, mockEmbeddings);
      const results = await engine.search('test', 'tenant-abc');

      const semResult = results.find((r) => r.id === 'sem-only');
      expect(semResult!.keywordScore).toBe(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockDbExecute = vi.fn();
const mockDbSelect = vi.fn();
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()
);

vi.mock('@edusphere/db', () => ({
  db: {
    execute: (...args: unknown[]) => mockDbExecute(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  transcript_segments: {
    id: 'id',
    text: 'text',
    transcript_id: 'transcript_id',
  },
  sql: vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
}));

// ─── CypherConceptService mock ────────────────────────────────────────────────
const mockFindAllConcepts = vi.fn();

vi.mock('./cypher-concept.service', () => ({
  CypherConceptService: class {
    findAllConcepts = mockFindAllConcepts;
  },
}));

// ─── EmbeddingService mock ────────────────────────────────────────────────────
const mockCallEmbeddingProvider = vi.fn();
const mockGenerateEmbedding = vi.fn();

vi.mock('../embedding/embedding.service', () => ({
  EmbeddingService: class {
    callEmbeddingProvider = mockCallEmbeddingProvider;
    generateEmbedding = mockGenerateEmbedding;
  },
}));

import { GraphSearchService } from './graph-search.service.js';
import { CypherConceptService } from './cypher-concept.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';

describe('GraphSearchService', () => {
  let service: GraphSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphSearchService(
      new CypherConceptService({} as never),
      new EmbeddingService()
    );
  });

  describe('semanticSearch()', () => {
    it('returns vector results when provider is available', async () => {
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2]);
      // Vector search returns 5 results (fills the limit), so ILIKE won't be called
      mockDbExecute.mockResolvedValue([
        { id: 'e1', segment_id: 's1', transcript_id: 't1', text: 'hello world', similarity: '0.92' },
        { id: 'e2', segment_id: 's2', transcript_id: 't1', text: 'hello there', similarity: '0.88' },
        { id: 'e3', segment_id: 's3', transcript_id: 't1', text: 'hello you', similarity: '0.81' },
        { id: 'e4', segment_id: 's4', transcript_id: 't1', text: 'hello again', similarity: '0.75' },
        { id: 'e5', segment_id: 's5', transcript_id: 't1', text: 'hello world 2', similarity: '0.70' },
      ]);
      mockFindAllConcepts.mockResolvedValue([]);

      const results = await service.semanticSearch(
        'hello',
        5,
        'tenant-1',
        'user-1',
        'STUDENT'
      );

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.entityType).toBe('transcript_segment');
    });

    it('falls back to ILIKE when vector provider throws', async () => {
      mockCallEmbeddingProvider.mockRejectedValue(new Error('no provider'));
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'seg-1',
                text: 'matching content',
                transcript_id: 't1',
              },
            ]),
          }),
        }),
      });
      mockFindAllConcepts.mockResolvedValue([]);

      const results = await service.semanticSearch(
        'matching',
        5,
        'tenant-1',
        'user-1',
        'STUDENT'
      );

      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('includes concept results in merged output', async () => {
      mockCallEmbeddingProvider.mockRejectedValue(new Error('no provider'));
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockFindAllConcepts.mockResolvedValue([
        {
          id: 'c1',
          name: 'recursion',
          definition: 'A function that calls itself',
          tenant_id: 'tenant-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]);

      const results = await service.semanticSearch(
        'recursion',
        5,
        'tenant-1',
        'user-1',
        'STUDENT'
      );

      const conceptResult = results.find((r) => r.entityType === 'concept');
      expect(conceptResult).toBeDefined();
    });

    it('returns empty array when all sources fail', async () => {
      mockCallEmbeddingProvider.mockRejectedValue(new Error('no provider'));
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockFindAllConcepts.mockResolvedValue([]);

      const results = await service.semanticSearch(
        'unknown',
        5,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(results).toEqual([]);
    });
  });

  describe('generateEmbedding()', () => {
    it('returns true for transcript_segment entity type', async () => {
      mockGenerateEmbedding.mockResolvedValue({});
      const result = await service.generateEmbedding(
        'text',
        'transcript_segment',
        'seg-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toBe(true);
    });

    it('returns false for unsupported entity type', async () => {
      const result = await service.generateEmbedding(
        'text',
        'concept',
        'c-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toBe(false);
    });

    it('returns false when generateEmbedding throws', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('LLM error'));
      const result = await service.generateEmbedding(
        'text',
        'transcript_segment',
        'seg-x',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toBe(false);
    });
  });
});

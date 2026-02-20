import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ─── DB mock ─────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockExecute = vi.fn();

const makeMockDb = () => ({
  select: mockSelect,
  delete: mockDelete,
  execute: mockExecute,
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => makeMockDb(),
  schema: {
    content_embeddings: {},
    annotation_embeddings: {},
    concept_embeddings: {},
    transcript_segments: {},
  },
  eq: vi.fn((_a, _b) => 'eq-cond'),
  inArray: vi.fn((_col, _vals) => 'in-cond'),
  sql: vi.fn((...args) => args),
}));

import { EmbeddingService } from './embedding.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockSelectChain(result: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

function mockDeleteChain(rowCount: number) {
  mockDelete.mockReturnValueOnce({
    where: vi.fn().mockResolvedValue({ rowCount }),
  });
}

const CE = {
  id: 'emb-1',
  segment_id: 'seg-1',
  embedding: [0.1, 0.2],
  created_at: new Date('2024-01-01'),
};

const AE = {
  id: 'emb-2',
  annotation_id: 'ann-1',
  embedding: [0.3, 0.4],
  created_at: new Date('2024-01-02'),
};

const CONC = {
  id: 'emb-3',
  concept_id: 'conc-1',
  embedding: [0.5, 0.6],
  created_at: new Date('2024-01-03'),
};

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmbeddingService();
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns content embedding when found in content_embeddings', async () => {
      mockSelectChain([CE]);
      const result = await service.findById('emb-1');
      expect(result.type).toBe('content');
      expect(result.refId).toBe('seg-1');
    });

    it('falls through to annotation_embeddings when not in content', async () => {
      mockSelectChain([]);
      mockSelectChain([AE]);
      const result = await service.findById('emb-2');
      expect(result.type).toBe('annotation');
      expect(result.refId).toBe('ann-1');
    });

    it('falls through to concept_embeddings when not in content or annotation', async () => {
      mockSelectChain([]);
      mockSelectChain([]);
      mockSelectChain([CONC]);
      const result = await service.findById('emb-3');
      expect(result.type).toBe('concept');
      expect(result.refId).toBe('conc-1');
    });

    it('throws NotFoundException when not found in any table', async () => {
      mockSelectChain([]);
      mockSelectChain([]);
      mockSelectChain([]);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('NotFoundException message includes the missing ID', async () => {
      mockSelectChain([]);
      mockSelectChain([]);
      mockSelectChain([]);
      await expect(service.findById('bad-id')).rejects.toThrow('bad-id');
    });
  });

  // ── findBySegment ─────────────────────────────────────────────────────────

  describe('findBySegment()', () => {
    it('returns mapped content embeddings for a segment', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([CE]),
        }),
      });
      const result = await service.findBySegment('seg-1');
      expect(result).toHaveLength(1);
      expect(result[0].refId).toBe('seg-1');
    });

    it('returns empty array when no embeddings for segment', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      const result = await service.findBySegment('seg-unknown');
      expect(result).toEqual([]);
    });
  });

  // ── generateEmbedding ─────────────────────────────────────────────────────

  describe('generateEmbedding()', () => {
    it('calls embedding provider and upserts into content_embeddings', async () => {
      const spy = vi
        .spyOn(service, 'callEmbeddingProvider')
        .mockResolvedValue([0.1, 0.2, 0.3]);
      const upsertedRow = {
        id: 'emb-new',
        segment_id: 'seg-1',
        embedding: [0.1, 0.2, 0.3],
        created_at: new Date(),
      };
      mockExecute.mockResolvedValue([upsertedRow]);

      const result = await service.generateEmbedding('hello world', 'seg-1');

      expect(spy).toHaveBeenCalledWith('hello world');
      expect(mockExecute).toHaveBeenCalledOnce();
      expect(result.type).toBe('content');
      expect(result.refId).toBe('seg-1');
    });

    it('throws when db.execute returns empty', async () => {
      vi.spyOn(service, 'callEmbeddingProvider').mockResolvedValue([0.1]);
      mockExecute.mockResolvedValue([]);
      await expect(
        service.generateEmbedding('text', 'seg-x')
      ).rejects.toThrow('Failed to upsert');
    });
  });

  // ── generateBatchEmbeddings ───────────────────────────────────────────────

  describe('generateBatchEmbeddings()', () => {
    it('returns 0 for empty segment list', async () => {
      expect(await service.generateBatchEmbeddings([])).toBe(0);
    });

    it('returns count of successfully embedded segments', async () => {
      const row = {
        id: 'e1',
        segment_id: 's1',
        embedding: [0.1],
        created_at: new Date(),
      };
      vi.spyOn(service, 'callEmbeddingProvider').mockResolvedValue([0.1]);
      mockExecute.mockResolvedValue([row]).mockResolvedValue([row]);

      const count = await service.generateBatchEmbeddings([
        { id: 's1', text: 'hello', transcriptId: 't1' },
        { id: 's2', text: 'world', transcriptId: 't1' },
      ]);
      expect(count).toBe(2);
    });

    it('skips failing segments and continues batch', async () => {
      const row = {
        id: 'e1',
        segment_id: 's1',
        embedding: [0.1],
        created_at: new Date(),
      };
      vi.spyOn(service, 'callEmbeddingProvider')
        .mockResolvedValueOnce([0.1])
        .mockRejectedValueOnce(new Error('provider error'));
      mockExecute.mockResolvedValue([row]);

      const count = await service.generateBatchEmbeddings([
        { id: 's1', text: 'ok', transcriptId: 't1' },
        { id: 's2', text: 'fail', transcriptId: 't1' },
      ]);
      expect(count).toBe(1);
    });
  });

  // ── semanticSearch ────────────────────────────────────────────────────────

  describe('semanticSearch()', () => {
    it('uses pgvector when provider is available', async () => {
      vi.spyOn(service, 'callEmbeddingProvider').mockResolvedValue([0.1, 0.2]);
      mockExecute.mockResolvedValue([
        { id: 'e1', segment_id: 's1', similarity: '0.92' },
      ]);

      const results = await service.semanticSearch('query', 'tenant-1', 5);
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.92);
    });

    it('falls back to ILIKE when provider throws', async () => {
      vi.spyOn(service, 'callEmbeddingProvider').mockRejectedValue(
        new Error('no provider')
      );
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 'seg-1', text: 'match text' },
            ]),
          }),
        }),
      });

      const results = await service.semanticSearch('match', 'tenant-1', 5);
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.75);
    });

    it('returns empty array when provider and ILIKE both return nothing', async () => {
      vi.spyOn(service, 'callEmbeddingProvider').mockRejectedValue(
        new Error('no provider')
      );
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const results = await service.semanticSearch('nothing', 'tenant-1', 5);
      expect(results).toEqual([]);
    });
  });

  // ── semanticSearchByVector ────────────────────────────────────────────────

  describe('semanticSearchByVector()', () => {
    it('executes pgvector query and maps results', async () => {
      mockExecute.mockResolvedValue([
        { id: 'e1', segment_id: 's1', type: 'content', similarity: '0.88' },
      ]);
      const results = await service.semanticSearchByVector([0.1, 0.2], 5, 0.7);
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBeCloseTo(0.88);
      expect(results[0].type).toBe('content');
    });

    it('returns empty when no results above threshold', async () => {
      mockExecute.mockResolvedValue([]);
      const results = await service.semanticSearchByVector([0.1], 5, 0.99);
      expect(results).toEqual([]);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('returns true when deleted from content_embeddings', async () => {
      mockDeleteChain(1);
      expect(await service.delete('emb-1')).toBe(true);
    });

    it('returns true when found in annotation_embeddings', async () => {
      mockDeleteChain(0);
      mockDeleteChain(1);
      expect(await service.delete('emb-2')).toBe(true);
    });

    it('returns true when found in concept_embeddings', async () => {
      mockDeleteChain(0);
      mockDeleteChain(0);
      mockDeleteChain(1);
      expect(await service.delete('emb-3')).toBe(true);
    });

    it('returns false when not in any table', async () => {
      mockDeleteChain(0);
      mockDeleteChain(0);
      mockDeleteChain(0);
      expect(await service.delete('missing')).toBe(false);
    });

    it('handles null rowCount gracefully', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: null }),
      });
      expect(await service.delete('x')).toBe(false);
    });
  });

  // ── legacy shims ──────────────────────────────────────────────────────────

  describe('findByContentItem() — deprecated shim', () => {
    it('returns empty array', async () => {
      expect(await service.findByContentItem('c-1')).toEqual([]);
    });
  });

  describe('deleteByContentItem() — deprecated shim', () => {
    it('returns 0', async () => {
      expect(await service.deleteByContentItem('c-1')).toBe(0);
    });
  });

  // ── callEmbeddingProvider ────────────────────────────────────────────────

  describe('callEmbeddingProvider()', () => {
    it('throws when neither OLLAMA_URL nor OPENAI_API_KEY is set', async () => {
      const orig = { ...process.env };
      delete process.env.OLLAMA_URL;
      delete process.env.OPENAI_API_KEY;
      await expect(service.callEmbeddingProvider('test')).rejects.toThrow(
        'No embedding provider'
      );
      Object.assign(process.env, orig);
    });
  });
});

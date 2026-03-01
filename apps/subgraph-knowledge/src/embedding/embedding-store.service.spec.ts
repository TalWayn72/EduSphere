import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ─── DB mock ──────────────────────────────────────────────────────────────────
// IMPORTANT: vi.mock factory is hoisted — do NOT reference outer variables.
// Instead, capture mocks via module import after vi.mock().
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockExecute = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
  })),
  // closeAllPools defined inside factory so no outer-variable hoisting issue
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    content_embeddings: { id: 'id', segment_id: 'segment_id' },
    annotation_embeddings: { id: 'id', annotation_id: 'annotation_id' },
    concept_embeddings: { id: 'id', concept_id: 'concept_id' },
    transcript_segments: { id: 'id', text: 'text' },
  },
  eq: vi.fn((_a: unknown, _b: unknown) => 'eq-cond'),
  sql: vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
}));

import { EmbeddingStoreService } from './embedding-store.service.js';
import * as db from '@edusphere/db';

function mockSelectChain(result: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

function mockDeleteChain(found: boolean) {
  const row = found ? { id: 'some-id' } : undefined;
  mockDelete.mockReturnValueOnce({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(row ? [row] : []),
    }),
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

describe('EmbeddingStoreService', () => {
  let service: EmbeddingStoreService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmbeddingStoreService();
  });

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools on destroy', async () => {
      await service.onModuleDestroy();
      expect(db.closeAllPools).toHaveBeenCalledOnce();
    });
  });

  describe('findById()', () => {
    it('returns content embedding when found', async () => {
      mockSelectChain([CE]);
      const result = await service.findById('emb-1');
      expect(result.type).toBe('content');
      expect(result.refId).toBe('seg-1');
    });

    it('falls through to annotation_embeddings', async () => {
      mockSelectChain([]);
      mockSelectChain([AE]);
      const result = await service.findById('emb-2');
      expect(result.type).toBe('annotation');
      expect(result.refId).toBe('ann-1');
    });

    it('falls through to concept_embeddings', async () => {
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
  });

  describe('findBySegment()', () => {
    it('returns mapped embeddings for the segment', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([CE]),
        }),
      });
      const result = await service.findBySegment('seg-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.refId).toBe('seg-1');
    });

    it('returns empty array when no embeddings', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      const result = await service.findBySegment('seg-unknown');
      expect(result).toEqual([]);
    });
  });

  describe('upsertContentEmbedding()', () => {
    it('returns mapped content record on success', async () => {
      mockExecute.mockResolvedValue([CE]);
      const result = await service.upsertContentEmbedding('seg-1', [0.1, 0.2]);
      expect(result.type).toBe('content');
      expect(result.refId).toBe('seg-1');
    });

    it('throws when db returns empty', async () => {
      mockExecute.mockResolvedValue([]);
      await expect(
        service.upsertContentEmbedding('seg-x', [0.1])
      ).rejects.toThrow('Failed to upsert');
    });
  });

  describe('delete()', () => {
    it('returns true when deleted from content_embeddings', async () => {
      mockDeleteChain(true);
      expect(await service.delete('emb-1')).toBe(true);
    });

    it('returns true when found in annotation_embeddings', async () => {
      mockDeleteChain(false);
      mockDeleteChain(true);
      expect(await service.delete('emb-2')).toBe(true);
    });

    it('returns true when found in concept_embeddings', async () => {
      mockDeleteChain(false);
      mockDeleteChain(false);
      mockDeleteChain(true);
      expect(await service.delete('emb-3')).toBe(true);
    });

    it('returns false when not found in any table', async () => {
      mockDeleteChain(false);
      mockDeleteChain(false);
      mockDeleteChain(false);
      expect(await service.delete('missing')).toBe(false);
    });
  });

  describe('ilikeFallback()', () => {
    it('maps results to SearchResult shape with similarity 0.75', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 'seg-x', text: 'matching content' },
            ]),
          }),
        }),
      });
      const results = await service.ilikeFallback('match', 5);
      expect(results).toHaveLength(1);
      expect(results[0]!.similarity).toBe(0.75);
      expect(results[0]!.type).toBe('transcript_segment');
    });

    it('returns empty array when no matches', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const results = await service.ilikeFallback('nomatch', 5);
      expect(results).toEqual([]);
    });
  });
});

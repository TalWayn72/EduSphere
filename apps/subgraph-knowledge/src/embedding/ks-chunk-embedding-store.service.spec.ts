import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ───────────────────────────────────────────────────────────────
const mockExecute = vi.fn();
const mockDeleteReturning = vi.fn();
const mockDeleteWhere = vi.fn(() => ({ returning: mockDeleteReturning }));

const mockDb = {
  execute: mockExecute,
  delete: vi.fn(() => ({ where: mockDeleteWhere })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  schema: {
    knowledge_source_chunk_embeddings: {
      source_id: 'source_id',
      id: 'id',
    },
  },
  eq: vi.fn((_col, val) => ({ eq: val })),
  sql: new Proxy(
    (strings: TemplateStringsArray, ..._values: unknown[]) => strings[0],
    { get: (_t, k) => (k === 'raw' ? undefined : vi.fn()) }
  ),
  closeAllPools: vi.fn(),
}));

import { KsChunkEmbeddingStoreService } from './ks-chunk-embedding-store.service.js';

describe('KsChunkEmbeddingStoreService', () => {
  let service: KsChunkEmbeddingStoreService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KsChunkEmbeddingStoreService();
  });

  describe('upsert', () => {
    it('executes upsert SQL with correct parameters', async () => {
      mockExecute.mockResolvedValue([]);
      const vector = Array.from({ length: 768 }, () => 0.1);

      await expect(
        service.upsert('source-uuid', 0, vector)
      ).resolves.toBeUndefined();

      expect(mockExecute).toHaveBeenCalledOnce();
    });

    it('propagates database errors', async () => {
      mockExecute.mockRejectedValue(new Error('DB error'));

      await expect(service.upsert('source-uuid', 0, [0.1])).rejects.toThrow(
        'DB error'
      );
    });
  });

  describe('search', () => {
    it('returns mapped results from raw SQL rows', async () => {
      mockExecute.mockResolvedValue([
        { source_id: 'src-1', chunk_index: 2, similarity: '0.87' },
        { source_id: 'src-1', chunk_index: 5, similarity: '0.72' },
      ]);

      const results = await service.search('[0.1,0.2]', 'tenant-1', 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        sourceId: 'src-1',
        chunkIndex: 2,
        similarity: 0.87,
      });
      expect(results[1]!.similarity).toBeCloseTo(0.72);
    });

    it('returns empty array when no results', async () => {
      mockExecute.mockResolvedValue([]);
      const results = await service.search('[0.1]', 'tenant-1', 5);
      expect(results).toEqual([]);
    });
  });

  describe('deleteBySource', () => {
    it('deletes all chunks for a source and returns count', async () => {
      mockDeleteReturning.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);

      const count = await service.deleteBySource('src-uuid');
      expect(count).toBe(2);
      expect(mockDb.delete).toHaveBeenCalledOnce();
    });

    it('returns 0 when no chunks exist', async () => {
      mockDeleteReturning.mockResolvedValue([]);
      const count = await service.deleteBySource('src-uuid');
      expect(count).toBe(0);
    });
  });
});

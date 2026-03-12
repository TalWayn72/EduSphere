import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── EmbeddingService mock ────────────────────────────────────────────────────
const mockCallEmbeddingProvider = vi.fn();
const mockSemanticSearchByVector = vi.fn();

vi.mock('./embedding.service', () => ({
  EmbeddingService: class {
    callEmbeddingProvider = mockCallEmbeddingProvider;
    semanticSearchByVector = mockSemanticSearchByVector;
  },
}));

import { EmbeddingDataLoader } from './embedding.dataloader.js';
import { EmbeddingService } from './embedding.service.js';
import type { TenantContext } from '@edusphere/db';

const mockTenantCtx: TenantContext = {
  tenantId: 'tenant-test-1',
  userId: 'user-test-1',
  userRole: 'STUDENT',
};

describe('EmbeddingDataLoader', () => {
  let loader: EmbeddingDataLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new EmbeddingDataLoader(new EmbeddingService());
  });

  describe('batchLoad()', () => {
    it('returns empty Map for empty input without calling provider', async () => {
      const result = await loader.batchLoad([], mockTenantCtx);
      expect(result.size).toBe(0);
      expect(mockCallEmbeddingProvider).not.toHaveBeenCalled();
    });

    it('calls embedding provider once per concept', async () => {
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2, 0.3]);
      mockSemanticSearchByVector.mockResolvedValue([
        { id: 'emb-1', refId: 'seg-1', type: 'content', similarity: 0.9 },
      ]);

      await loader.batchLoad(['conceptA', 'conceptB'], mockTenantCtx);

      expect(mockCallEmbeddingProvider).toHaveBeenCalledTimes(2);
      expect(mockCallEmbeddingProvider).toHaveBeenCalledWith('conceptA');
      expect(mockCallEmbeddingProvider).toHaveBeenCalledWith('conceptB');
    });

    it('returns a Map with one key per concept', async () => {
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2]);
      mockSemanticSearchByVector.mockResolvedValue([
        { id: 'emb-1', refId: 'seg-1', type: 'content', similarity: 0.85 },
      ]);

      const result = await loader.batchLoad(['conceptA', 'conceptB'], mockTenantCtx);

      expect(result.size).toBe(2);
      expect(result.has('conceptA')).toBe(true);
      expect(result.has('conceptB')).toBe(true);
    });

    it('returns search results for each concept', async () => {
      mockCallEmbeddingProvider.mockResolvedValue([0.5, 0.6]);
      mockSemanticSearchByVector.mockResolvedValue([
        { id: 'emb-x', refId: 'seg-x', type: 'content', similarity: 0.92 },
      ]);

      const result = await loader.batchLoad(['React'], mockTenantCtx);

      const hits = result.get('React');
      expect(hits).toHaveLength(1);
      expect(hits![0]!.similarity).toBe(0.92);
    });

    it('handles provider failure gracefully — sets empty array for failed concept', async () => {
      mockCallEmbeddingProvider.mockRejectedValue(new Error('provider down'));

      const result = await loader.batchLoad(['FailConcept'], mockTenantCtx);

      expect(result.size).toBe(1);
      expect(result.get('FailConcept')).toEqual([]);
      expect(mockSemanticSearchByVector).not.toHaveBeenCalled();
    });

    it('handles vector search failure gracefully — sets empty array', async () => {
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2]);
      mockSemanticSearchByVector.mockRejectedValue(new Error('db error'));

      const result = await loader.batchLoad(['Algebra'], mockTenantCtx);

      expect(result.size).toBe(1);
      expect(result.get('Algebra')).toEqual([]);
    });

    it('still returns results for healthy concepts when one fails', async () => {
      mockCallEmbeddingProvider
        .mockResolvedValueOnce([0.1, 0.2]) // conceptA succeeds
        .mockRejectedValueOnce(new Error('fail')); // conceptB fails

      mockSemanticSearchByVector.mockResolvedValue([
        { id: 'e1', refId: 's1', type: 'content', similarity: 0.8 },
      ]);

      const result = await loader.batchLoad(['conceptA', 'conceptB'], mockTenantCtx);

      expect(result.get('conceptA')).toHaveLength(1);
      expect(result.get('conceptB')).toEqual([]);
    });
  });
});

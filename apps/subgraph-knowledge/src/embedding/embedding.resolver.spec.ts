import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingResolver } from './embedding.resolver';

// --- Mocks ---

const mockEmbeddingService = {
  findById: vi.fn(),
  findByContentItem: vi.fn(),
  semanticSearch: vi.fn(),
  semanticSearchByVector: vi.fn(),
  semanticSearchByContentItem: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  deleteByContentItem: vi.fn(),
};

const MOCK_EMBED = {
  id: 'embed-1',
  type: 'content',
  similarity: 0.9,
};

describe('EmbeddingResolver', () => {
  let resolver: EmbeddingResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver = new EmbeddingResolver(mockEmbeddingService as any);
  });

  describe('getEmbedding()', () => {
    it('calls embeddingService.findById with provided id', async () => {
      mockEmbeddingService.findById.mockResolvedValue(MOCK_EMBED);
      const result = await resolver.getEmbedding('embed-1');
      expect(mockEmbeddingService.findById).toHaveBeenCalledWith('embed-1');
      expect(result).toEqual(MOCK_EMBED);
    });

    it('propagates NotFoundException from service', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      mockEmbeddingService.findById.mockRejectedValue(
        new NotFoundException('Not found')
      );
      await expect(resolver.getEmbedding('bad-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getEmbeddingsByContentItem()', () => {
    it('calls embeddingService.findByContentItem with provided contentItemId', async () => {
      mockEmbeddingService.findByContentItem.mockResolvedValue([]);
      const result = await resolver.getEmbeddingsByContentItem('content-1');
      expect(mockEmbeddingService.findByContentItem).toHaveBeenCalledWith(
        'content-1'
      );
      expect(result).toEqual([]);
    });
  });

  describe('semanticSearch()', () => {
    it('calls embeddingService.semanticSearchByVector with correct args', async () => {
      mockEmbeddingService.semanticSearchByVector.mockResolvedValue([
        MOCK_EMBED,
      ]);
      const query = [0.1, 0.2, 0.3];
      const result = await resolver.semanticSearch(query, 5, 0.8);
      expect(mockEmbeddingService.semanticSearchByVector).toHaveBeenCalledWith(
        query,
        5,
        0.8
      );
      expect(result).toHaveLength(1);
    });

    it('uses default limit=10 and minSimilarity=0.7 when not provided', async () => {
      mockEmbeddingService.semanticSearchByVector.mockResolvedValue([]);
      await resolver.semanticSearch([0.1, 0.2]);
      expect(mockEmbeddingService.semanticSearchByVector).toHaveBeenCalledWith(
        [0.1, 0.2],
        10,
        0.7
      );
    });
  });

  describe('semanticSearchByContentItem()', () => {
    it('delegates to embeddingService.semanticSearchByVector (legacy shim)', async () => {
      mockEmbeddingService.semanticSearchByVector.mockResolvedValue([]);
      const result = await resolver.semanticSearchByContentItem(
        'content-1',
        [0.1, 0.2],
        3
      );
      // Resolver ignores contentItemId and delegates entirely to semanticSearchByVector
      expect(mockEmbeddingService.semanticSearchByVector).toHaveBeenCalledWith(
        [0.1, 0.2],
        3,
        0.7
      );
      expect(result).toEqual([]);
    });

    it('uses default limit=5 when not provided', async () => {
      mockEmbeddingService.semanticSearchByVector.mockResolvedValue([]);
      await resolver.semanticSearchByContentItem('content-1', [0.1]);
      expect(mockEmbeddingService.semanticSearchByVector).toHaveBeenCalledWith(
        [0.1],
        5,
        0.7
      );
    });
  });

  describe('createEmbedding()', () => {
    it('throws immediately without calling embeddingService.create', async () => {
      // Resolver throws before delegating — create is intentionally disabled
      await expect(
        resolver.createEmbedding({ type: 'content' })
      ).rejects.toThrow('Use generateEmbedding');
      expect(mockEmbeddingService.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteEmbedding()', () => {
    it('calls embeddingService.delete and returns true', async () => {
      mockEmbeddingService.delete.mockResolvedValue(true);
      const result = await resolver.deleteEmbedding('embed-1');
      expect(mockEmbeddingService.delete).toHaveBeenCalledWith('embed-1');
      expect(result).toBe(true);
    });

    it('returns false when embedding not found', async () => {
      mockEmbeddingService.delete.mockResolvedValue(false);
      const result = await resolver.deleteEmbedding('missing-id');
      expect(result).toBe(false);
    });
  });

  describe('deleteEmbeddingsByContentItem()', () => {
    it('calls embeddingService.deleteByContentItem with provided contentItemId', async () => {
      mockEmbeddingService.deleteByContentItem.mockResolvedValue(0);
      const result = await resolver.deleteEmbeddingsByContentItem('content-1');
      expect(mockEmbeddingService.deleteByContentItem).toHaveBeenCalledWith(
        'content-1'
      );
      expect(result).toBe(0);
    });
  });

  describe('resolveReference()', () => {
    it('calls embeddingService.findById with reference id', async () => {
      mockEmbeddingService.findById.mockResolvedValue(MOCK_EMBED);
      const result = await resolver.resolveReference({
        __typename: 'Embedding',
        id: 'embed-1',
      });
      expect(mockEmbeddingService.findById).toHaveBeenCalledWith('embed-1');
      expect(result).toEqual(MOCK_EMBED);
    });
  });
});

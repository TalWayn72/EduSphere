import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ───────────────────────────────────────────────────────────────
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));

const mockDb = {
  update: vi.fn(() => ({ set: mockUpdateSet })),
  select: vi.fn(() => ({ from: mockSelectFrom })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  schema: {
    knowledgeSources: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      status: 'status',
    },
  },
  eq: vi.fn((_col, val) => ({ eq: val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

// ─── DocumentParserService mock ────────────────────────────────────────────
const mockChunkText = vi.fn();
vi.mock('./document-parser.service', () => ({
  DocumentParserService: class {
    chunkText = mockChunkText;
  },
}));

// ─── EmbeddingService mock ─────────────────────────────────────────────────
const mockCallEmbeddingProvider = vi.fn();
vi.mock('../embedding/embedding.service', () => ({
  EmbeddingService: class {
    callEmbeddingProvider = mockCallEmbeddingProvider;
  },
}));

// ─── KsChunkEmbeddingStoreService mock ────────────────────────────────────
const mockKsUpsert = vi.fn();
vi.mock('../embedding/ks-chunk-embedding-store.service', () => ({
  KsChunkEmbeddingStoreService: class {
    upsert = mockKsUpsert;
  },
}));

import { KnowledgeSourceReindexService } from './knowledge-source-reindex.service.js';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';
import { KsChunkEmbeddingStoreService } from '../embedding/ks-chunk-embedding-store.service.js';

const fakeSource = {
  id: 'src-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Test Source',
  status: 'READY',
  raw_content: 'Hello world content here',
};

describe('KnowledgeSourceReindexService', () => {
  let service: KnowledgeSourceReindexService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KnowledgeSourceReindexService(
      new DocumentParserService() as never,
      new EmbeddingService() as never,
      new KsChunkEmbeddingStoreService() as never
    );
  });

  describe('reindexCourseEmbeddings', () => {
    it('reindexes all READY sources for a course', async () => {
      mockSelectWhere.mockResolvedValue([fakeSource]);
      mockChunkText.mockReturnValue([
        { text: 'Hello world', index: 0 },
        { text: 'content here', index: 1 },
      ]);
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2]);
      mockKsUpsert.mockResolvedValue(undefined);

      const result = await service.reindexCourseEmbeddings(
        'tenant-1',
        'course-1'
      );

      expect(result.sourcesProcessed).toBe(1);
      expect(result.embeddingsGenerated).toBe(2);
      expect(result.errors).toEqual([]);
      expect(mockKsUpsert).toHaveBeenCalledTimes(2);
      expect(mockKsUpsert).toHaveBeenCalledWith('src-1', 0, [0.1, 0.2]);
      expect(mockKsUpsert).toHaveBeenCalledWith('src-1', 1, [0.1, 0.2]);
    });

    it('skips source with empty raw_content and records error', async () => {
      const emptySource = { ...fakeSource, raw_content: '' };
      mockSelectWhere.mockResolvedValue([emptySource]);

      const result = await service.reindexCourseEmbeddings(
        'tenant-1',
        'course-1'
      );

      expect(result.sourcesProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('no raw_content');
    });

    it('returns zeros when no READY sources exist', async () => {
      mockSelectWhere.mockResolvedValue([]);

      const result = await service.reindexCourseEmbeddings(
        'tenant-1',
        'course-1'
      );

      expect(result).toEqual({
        sourcesProcessed: 0,
        embeddingsGenerated: 0,
        errors: [],
      });
    });

    it('records error per source when embedding provider fails', async () => {
      mockSelectWhere.mockResolvedValue([fakeSource]);
      mockChunkText.mockReturnValue([{ text: 'chunk', index: 0 }]);
      mockCallEmbeddingProvider.mockRejectedValue(new Error('Provider down'));

      const result = await service.reindexCourseEmbeddings(
        'tenant-1',
        'course-1'
      );

      // Chunk error is warn-only; source still counts as processed with 0 embeddings
      expect(result.sourcesProcessed).toBe(1);
      expect(result.embeddingsGenerated).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('handles multiple sources with partial failure', async () => {
      const source2 = { ...fakeSource, id: 'src-2', raw_content: null };
      mockSelectWhere.mockResolvedValue([fakeSource, source2]);
      mockChunkText.mockReturnValue([{ text: 'chunk', index: 0 }]);
      mockCallEmbeddingProvider.mockResolvedValue([0.5]);
      mockKsUpsert.mockResolvedValue(undefined);

      const result = await service.reindexCourseEmbeddings(
        'tenant-1',
        'course-1'
      );

      expect(result.sourcesProcessed).toBe(1);
      expect(result.embeddingsGenerated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('src-2');
    });
  });
});

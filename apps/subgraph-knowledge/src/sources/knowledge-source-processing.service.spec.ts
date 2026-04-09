import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';

// ─── DB mock ───────────────────────────────────────────────────────────────
const mockInsertReturning = vi.fn();
const mockUpdateReturning = vi.fn();
const mockUpdateSet = vi.fn(() => ({
  where: vi.fn(() => ({
    returning: mockUpdateReturning,
  })),
}));

const mockDb = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({ returning: mockInsertReturning })),
  })),
  update: vi.fn(() => ({ set: mockUpdateSet })),
  select: vi.fn(() => ({ from: vi.fn() })),
};

const mockCreateSourceNode = vi.fn().mockResolvedValue(undefined);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  createSourceNode: (...args: unknown[]) => mockCreateSourceNode(...args),
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
  inArray: vi.fn((_col, vals) => ({ inArray: vals })),
}));

// ─── DocumentParserService mock ────────────────────────────────────────────
const mockChunkText = vi.fn();
const mockParseText = vi.fn();
const mockParsePdf = vi.fn();
const mockParseDocx = vi.fn();
const mockParseUrl = vi.fn();
const mockParseYoutube = vi.fn();

vi.mock('./document-parser.service', () => ({
  DocumentParserService: class {
    chunkText = mockChunkText;
    parseText = mockParseText;
    parsePdf = mockParsePdf;
    parseDocx = mockParseDocx;
    parseUrl = mockParseUrl;
    parseYoutube = mockParseYoutube;
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

// ─── KnowledgeSourceReindexService mock ───────────────────────────────────
const mockReindexCourse = vi.fn();
vi.mock('./knowledge-source-reindex.service', () => ({
  KnowledgeSourceReindexService: class {
    reindexCourseEmbeddings = mockReindexCourse;
  },
}));

// ─── MinioUrlService mock ──────────────────────────────────────────────────
const mockUploadFile = vi.fn();
vi.mock('./minio-url.service', () => ({
  MinioUrlService: class {
    uploadFile = mockUploadFile;
  },
}));

import { KnowledgeSourceProcessingService } from './knowledge-source-processing.service.js';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';
import { KsChunkEmbeddingStoreService } from '../embedding/ks-chunk-embedding-store.service.js';
import { KnowledgeSourceReindexService } from './knowledge-source-reindex.service.js';
import { MinioUrlService } from './minio-url.service.js';

const baseInput = {
  tenantId: 'tenant-1',
  courseId: 'course-1',
  title: 'Test Source',
  sourceType: 'TEXT' as const,
  origin: 'manual',
  rawText: 'Hello world content',
};

const fakeSource = {
  id: 'src-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Test Source',
  status: 'PENDING',
};

describe('KnowledgeSourceProcessingService', () => {
  let service: KnowledgeSourceProcessingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KnowledgeSourceProcessingService(
      new DocumentParserService() as never,
      new EmbeddingService() as never,
      new KsChunkEmbeddingStoreService() as never,
      new KnowledgeSourceReindexService() as never,
      new MinioUrlService() as never
    );
  });

  // ── processSource ─────────────────────────────────────────────────────
  describe('processSource', () => {
    it('processes TEXT source through parse→chunk→embed pipeline', async () => {
      mockParseText.mockResolvedValue({
        text: 'Hello world',
        wordCount: 2,
        metadata: {},
      });
      mockChunkText.mockReturnValue([{ text: 'Hello world', index: 0 }]);
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2, 0.3]);
      mockKsUpsert.mockResolvedValue(undefined);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY', chunk_count: 1 },
      ]);

      const result = await service.processSource('src-1', baseInput);
      expect(result.status).toBe('READY');
      expect(mockCallEmbeddingProvider).toHaveBeenCalledWith('Hello world');
      expect(mockKsUpsert).toHaveBeenCalledWith(
        'src-1',
        0,
        [0.1, 0.2, 0.3],
        'Hello world'
      );
    });

    it('marks source FAILED when extraction throws', async () => {
      mockParseText.mockRejectedValue(new Error('Parse error'));
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'FAILED', error_message: 'Parse error' },
      ]);

      const result = await service.processSource('src-1', baseInput);
      expect(result.status).toBe('FAILED');
    });

    it('continues embedding even when one chunk fails', async () => {
      mockParseText.mockResolvedValue({
        text: 'chunk1. chunk2.',
        wordCount: 4,
        metadata: {},
      });
      mockChunkText.mockReturnValue([
        { text: 'chunk1', index: 0 },
        { text: 'chunk2', index: 1 },
      ]);
      mockCallEmbeddingProvider
        .mockRejectedValueOnce(new Error('embed error'))
        .mockResolvedValueOnce([0.1]);
      mockKsUpsert.mockResolvedValue(undefined);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY', chunk_count: 1 },
      ]);

      const result = await service.processSource('src-1', baseInput);
      expect(result.status).toBe('READY');
      expect(mockCallEmbeddingProvider).toHaveBeenCalledTimes(2);
    });

    it('throws when update returns no rows', async () => {
      mockParseText.mockResolvedValue({
        text: 'Hi',
        wordCount: 1,
        metadata: {},
      });
      mockChunkText.mockReturnValue([]);
      mockUpdateReturning.mockResolvedValue([]);

      await expect(service.processSource('src-1', baseInput)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  // ── reindexCourseEmbeddings — delegates to KnowledgeSourceReindexService
  describe('reindexCourseEmbeddings', () => {
    it('delegates to KnowledgeSourceReindexService', async () => {
      mockReindexCourse.mockResolvedValue({
        sourcesProcessed: 3,
        embeddingsGenerated: 15,
        errors: [],
      });

      const result = await service.reindexCourseEmbeddings(
        'tenant-1',
        'course-1'
      );
      expect(result.sourcesProcessed).toBe(3);
      expect(result.embeddingsGenerated).toBe(15);
      expect(mockReindexCourse).toHaveBeenCalledWith('tenant-1', 'course-1');
    });
  });

  // ── createAndProcess ──────────────────────────────────────────────────
  describe('createAndProcess', () => {
    it('creates source row and returns it immediately', async () => {
      mockInsertReturning.mockResolvedValue([fakeSource]);
      // processSource runs in background — mock extractText to resolve
      mockParseText.mockResolvedValue({
        text: '',
        wordCount: 0,
        metadata: {},
      });
      mockChunkText.mockReturnValue([]);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY' },
      ]);

      const result = await service.createAndProcess(baseInput);
      expect(result.id).toBe('src-1');
      expect(mockInsertReturning).toHaveBeenCalled();
    });

    it('throws when insert fails', async () => {
      mockInsertReturning.mockResolvedValue([]);
      await expect(service.createAndProcess(baseInput)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  // ── Graph indexing (GAP 9) ────────────────────────────────────────────
  describe('graph indexing via createSourceNode', () => {
    it('calls createSourceNode when source is marked READY', async () => {
      mockParseText.mockResolvedValue({
        text: 'hello',
        wordCount: 1,
        metadata: {},
      });
      mockChunkText.mockReturnValue([{ text: 'hello', index: 0 }]);
      mockCallEmbeddingProvider.mockResolvedValue([0.1, 0.2]);
      mockKsUpsert.mockResolvedValue(undefined);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY', chunk_count: 1 },
      ]);

      await service.processSource('src-1', baseInput);
      expect(mockCreateSourceNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'src-1',
          tenant_id: 'tenant-1',
          name: 'Test Source',
          source_type: 'TEXT',
        })
      );
    });

    it('still marks source READY even when createSourceNode throws', async () => {
      mockCreateSourceNode.mockRejectedValueOnce(new Error('graph down'));
      mockParseText.mockResolvedValue({
        text: 'hello',
        wordCount: 1,
        metadata: {},
      });
      mockChunkText.mockReturnValue([]);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY', chunk_count: 0 },
      ]);

      const result = await service.processSource('src-1', baseInput);
      expect(result.status).toBe('READY');
    });
  });
});

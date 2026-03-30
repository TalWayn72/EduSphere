import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

// ─── DB mock ───────────────────────────────────────────────────────────────
const mockInsertReturning = vi.fn();
const mockUpdateReturning = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: vi.fn(() => ({
  returning: mockUpdateReturning,
})) }));
const mockSelectFrom = vi.fn();

const mockDb = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({ returning: mockInsertReturning })),
  })),
  update: vi.fn(() => ({ set: mockUpdateSet })),
  select: vi.fn(() => ({ from: mockSelectFrom })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  schema: {
    knowledgeSources: { id: 'id', tenant_id: 'tenant_id', course_id: 'course_id', status: 'status' },
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
const mockGenerateEmbedding = vi.fn();
vi.mock('../embedding/embedding.service', () => ({
  EmbeddingService: class {
    generateEmbedding = mockGenerateEmbedding;
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
      mockChunkText.mockReturnValue([
        { text: 'Hello world', index: 0 },
      ]);
      mockGenerateEmbedding.mockResolvedValue(undefined);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY', chunk_count: 1 },
      ]);

      const result = await service.processSource('src-1', baseInput);
      expect(result.status).toBe('READY');
      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        'Hello world', 'ks:src-1:0'
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
      mockGenerateEmbedding
        .mockRejectedValueOnce(new Error('embed error'))
        .mockResolvedValueOnce(undefined);
      mockUpdateReturning.mockResolvedValue([
        { ...fakeSource, status: 'READY', chunk_count: 1 },
      ]);

      const result = await service.processSource('src-1', baseInput);
      expect(result.status).toBe('READY');
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(2);
    });

    it('throws when update returns no rows', async () => {
      mockParseText.mockResolvedValue({
        text: 'Hi', wordCount: 1, metadata: {},
      });
      mockChunkText.mockReturnValue([]);
      mockUpdateReturning.mockResolvedValue([]);

      await expect(
        service.processSource('src-1', baseInput)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── reindexCourseEmbeddings ───────────────────────────────────────────
  describe('reindexCourseEmbeddings', () => {
    it('reindexes all READY sources for a course', async () => {
      const source = { ...fakeSource, status: 'READY', raw_content: 'content' };
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockResolvedValue([source]),
      });
      mockChunkText.mockReturnValue([{ text: 'content', index: 0 }]);
      mockGenerateEmbedding.mockResolvedValue(undefined);
      mockUpdateSet.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.reindexCourseEmbeddings('tenant-1', 'course-1');
      expect(result.sourcesProcessed).toBe(1);
      expect(result.embeddingsGenerated).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('collects errors for failed source reindexing', async () => {
      const source = { ...fakeSource, status: 'READY', raw_content: '' };
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockResolvedValue([source]),
      });

      const result = await service.reindexCourseEmbeddings('tenant-1', 'course-1');
      expect(result.sourcesProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('no raw_content');
    });

    it('returns zeros when no READY sources exist', async () => {
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await service.reindexCourseEmbeddings('tenant-1', 'course-1');
      expect(result).toEqual({
        sourcesProcessed: 0,
        embeddingsGenerated: 0,
        errors: [],
      });
    });
  });

  // ── createAndProcess ──────────────────────────────────────────────────
  describe('createAndProcess', () => {
    it('creates source row and returns it immediately', async () => {
      mockInsertReturning.mockResolvedValue([fakeSource]);
      // processSource runs in background — mock extractText to resolve
      mockParseText.mockResolvedValue({
        text: '', wordCount: 0, metadata: {},
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
});

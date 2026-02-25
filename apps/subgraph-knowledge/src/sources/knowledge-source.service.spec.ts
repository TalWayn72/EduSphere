/**
 * knowledge-source.service.spec.ts
 *
 * Unit tests for KnowledgeSourceService.
 * Tests: listByCourseSources, findById, createAndProcess, deleteSource.
 * All DB calls and service dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockCloseAllPools, mockInsert, mockSelect, mockUpdate, mockDelete } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  return { mockCloseAllPools, mockInsert, mockSelect, mockUpdate, mockDelete };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  }),
  closeAllPools: mockCloseAllPools,
  schema: {
    knowledgeSources: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      status: 'status',
      raw_content: 'raw_content',
      chunk_count: 'chunk_count',
      metadata: 'metadata',
      error_message: 'error_message',
      created_at: 'created_at',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}));

import { KnowledgeSourceService } from './knowledge-source.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT = 'tenant-abc';
const COURSE = 'course-123';

const MOCK_SOURCE = {
  id: 'ks-1',
  tenant_id: TENANT,
  course_id: COURSE,
  title: 'Test Source',
  source_type: 'TEXT' as const,
  origin: 'manual',
  status: 'READY' as const,
  raw_content: 'Hello world',
  chunk_count: 1,
  error_message: null,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PENDING_SOURCE = { ...MOCK_SOURCE, id: 'ks-new', status: 'PENDING' as const };

// ─── Helpers to build mock Drizzle query chains ───────────────────────────────

/**
 * Drizzle's select() chain can be awaited at any step:
 *   .select().from().where()            → awaitable
 *   .select().from().where().orderBy()  → awaitable
 *
 * We model this with a thenable that also exposes chainable methods.
 */
function buildSelect(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockResolvedValue(rows);
  // whereResult acts as a Promise AND supports .orderBy() / .limit()
  const whereResult = Object.assign(Promise.resolve(rows), { orderBy, limit });
  const where = vi.fn().mockReturnValue(whereResult);
  const from = vi.fn().mockReturnValue({ where });
  return vi.fn().mockReturnValue({ from });
}

function buildInsert(row: unknown) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  return vi.fn().mockReturnValue({ values });
}

function buildUpdate(row: unknown) {
  const returning = vi.fn().mockResolvedValue([row]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return vi.fn().mockReturnValue({ set });
}

function buildDelete() {
  const where = vi.fn().mockResolvedValue([]);
  return vi.fn().mockReturnValue({ where });
}

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockParser = {
  parseText: vi.fn().mockReturnValue({ text: 'parsed text', wordCount: 2, metadata: {} }),
  parseUrl: vi.fn().mockResolvedValue({ text: 'url text', wordCount: 2, metadata: {} }),
  parseDocx: vi.fn().mockResolvedValue({ text: 'docx text', wordCount: 2, metadata: {} }),
  chunkText: vi.fn().mockReturnValue([{ index: 0, text: 'chunk 1' }]),
};

const mockEmbeddings = {
  generateEmbedding: vi.fn().mockResolvedValue({ id: 'emb-1' }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KnowledgeSourceService', () => {
  let service: KnowledgeSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KnowledgeSourceService(mockParser as any, mockEmbeddings as any);
  });

  // ── listByCourseSources ────────────────────────────────────────────────────

  describe('listByCourseSources()', () => {
    it('returns sources for a course', async () => {
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      const result = await service.listByCourseSources(TENANT, COURSE);
      expect(result).toEqual([MOCK_SOURCE]);
    });

    it('returns empty array when no sources found', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      const result = await service.listByCourseSources(TENANT, COURSE);
      expect(result).toEqual([]);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns source when found', async () => {
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      const result = await service.findById('ks-1', TENANT);
      expect(result).toEqual(MOCK_SOURCE);
    });

    it('throws NotFoundException when source does not exist', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      await expect(service.findById('missing', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('includes id in NotFoundException message', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      await expect(service.findById('bad-id', TENANT)).rejects.toThrow('bad-id');
    });
  });

  // ── createAndProcess — TEXT type ───────────────────────────────────────────

  describe('createAndProcess() — TEXT source', () => {
    it('inserts source as PENDING, then sets to READY', async () => {
      const readySource = { ...PENDING_SOURCE, status: 'READY' as const, chunk_count: 1 };
      mockInsert.mockImplementation(buildInsert(PENDING_SOURCE));
      mockUpdate.mockImplementation(buildUpdate(readySource));

      const result = await service.createAndProcess({
        tenantId: TENANT,
        courseId: COURSE,
        title: 'Manual Text',
        sourceType: 'TEXT',
        origin: 'manual',
        rawText: 'Hello from test',
      });

      expect(mockParser.parseText).toHaveBeenCalledWith('Hello from test');
      expect(mockParser.chunkText).toHaveBeenCalled();
      expect(mockEmbeddings.generateEmbedding).toHaveBeenCalledWith(
        'chunk 1',
        expect.stringContaining('ks:'),
      );
      expect(result.status).toBe('READY');
    });

    it('marks source as FAILED when parser throws', async () => {
      const failedSource = { ...PENDING_SOURCE, status: 'FAILED' as const, error_message: 'parse error' };
      mockInsert.mockImplementation(buildInsert(PENDING_SOURCE));

      // First update (PROCESSING) succeeds; second (FAILED) returns failed source
      let updateCall = 0;
      mockUpdate.mockImplementation(() => {
        updateCall++;
        const row = updateCall === 1 ? PENDING_SOURCE : failedSource;
        const returning = vi.fn().mockResolvedValue([row]);
        const where = vi.fn().mockReturnValue({ returning });
        const set = vi.fn().mockReturnValue({ where });
        return { set };
      });

      mockParser.parseText.mockImplementationOnce(() => { throw new Error('parse error'); });

      const result = await service.createAndProcess({
        tenantId: TENANT,
        courseId: COURSE,
        title: 'Bad source',
        sourceType: 'TEXT',
        origin: 'manual',
        rawText: 'fail',
      });

      expect(result.status).toBe('FAILED');
    });
  });

  // ── createAndProcess — URL type ────────────────────────────────────────────

  describe('createAndProcess() — URL source', () => {
    it('calls parseUrl with the origin URL', async () => {
      const readySource = { ...PENDING_SOURCE, status: 'READY' as const };
      mockInsert.mockImplementation(buildInsert(PENDING_SOURCE));
      mockUpdate.mockImplementation(buildUpdate(readySource));

      await service.createAndProcess({
        tenantId: TENANT,
        courseId: COURSE,
        title: 'Example',
        sourceType: 'URL',
        origin: 'https://example.com/article',
      });

      expect(mockParser.parseUrl).toHaveBeenCalledWith('https://example.com/article');
    });
  });

  // ── createAndProcess — DOCX type ───────────────────────────────────────────

  describe('createAndProcess() — FILE_DOCX source', () => {
    it('calls parseDocx with the file path', async () => {
      const readySource = { ...PENDING_SOURCE, status: 'READY' as const };
      mockInsert.mockImplementation(buildInsert(PENDING_SOURCE));
      mockUpdate.mockImplementation(buildUpdate(readySource));

      await service.createAndProcess({
        tenantId: TENANT,
        courseId: COURSE,
        title: 'DOCX file',
        sourceType: 'FILE_DOCX',
        origin: '/path/to/file.docx',
      });

      expect(mockParser.parseDocx).toHaveBeenCalledWith('/path/to/file.docx');
    });
  });

  // ── createAndProcess — embedding failure is non-fatal ─────────────────────

  describe('createAndProcess() — partial embedding failure', () => {
    it('continues processing when some embeddings fail', async () => {
      mockParser.chunkText.mockReturnValueOnce([
        { index: 0, text: 'chunk 0' },
        { index: 1, text: 'chunk 1' },
      ]);
      mockEmbeddings.generateEmbedding
        .mockResolvedValueOnce({ id: 'emb-0' })
        .mockRejectedValueOnce(new Error('provider down'));

      const readySource = { ...PENDING_SOURCE, status: 'READY' as const, chunk_count: 1 };
      mockInsert.mockImplementation(buildInsert(PENDING_SOURCE));
      mockUpdate.mockImplementation(buildUpdate(readySource));

      const result = await service.createAndProcess({
        tenantId: TENANT,
        courseId: COURSE,
        title: 'Partial',
        sourceType: 'TEXT',
        origin: 'manual',
        rawText: 'two chunks text',
      });

      // Only 1 out of 2 chunks embedded successfully — service still marks READY
      expect(result.status).toBe('READY');
    });
  });

  // ── deleteSource ──────────────────────────────────────────────────────────

  describe('deleteSource()', () => {
    it('deletes the source and returns void', async () => {
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockDelete.mockImplementation(buildDelete());

      await expect(service.deleteSource('ks-1', TENANT)).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('throws NotFoundException if source does not exist', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      await expect(service.deleteSource('ghost', TENANT)).rejects.toThrow(NotFoundException);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ── onModuleDestroy ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools()', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });
  });
});

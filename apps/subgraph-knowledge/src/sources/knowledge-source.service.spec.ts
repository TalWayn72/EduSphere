/* Tests for KnowledgeSourceService — no-explicit-any removed */
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

const {
  mockCloseAllPools,
  mockInsert,
  mockSelect,
  mockUpdate,
  mockDelete,
  mockCreateSourceNode,
} = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockCreateSourceNode = vi.fn().mockResolvedValue(undefined);
  return {
    mockCloseAllPools,
    mockInsert,
    mockSelect,
    mockUpdate,
    mockDelete,
    mockCreateSourceNode,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  }),
  closeAllPools: mockCloseAllPools,
  createSourceNode: (...args: unknown[]) => mockCreateSourceNode(...args),
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
      file_key: 'file_key',
      created_at: 'created_at',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  inArray: vi.fn((col, vals) => ({ inArray: [col, vals] })),
}));

vi.mock('./minio-url.service.js', () => ({
  MinioUrlService: class {},
}));

vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
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

const PENDING_SOURCE = {
  ...MOCK_SOURCE,
  id: 'ks-new',
  status: 'PENDING' as const,
};

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

function _buildInsert(row: unknown) {
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

const mockProcessingService = {
  createAndProcess: vi.fn().mockResolvedValue(PENDING_SOURCE),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KnowledgeSourceService', () => {
  let service: KnowledgeSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KnowledgeSourceService(mockProcessingService as never);
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
      await expect(service.findById('missing', TENANT)).rejects.toThrow(
        NotFoundException
      );
    });

    it('includes id in NotFoundException message', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      await expect(service.findById('bad-id', TENANT)).rejects.toThrow(
        'bad-id'
      );
    });
  });

  // ── createAndProcess (delegates to processingService) ─────────────────────

  describe('createAndProcess()', () => {
    it('delegates to processingService.createAndProcess', async () => {
      const input = {
        tenantId: TENANT,
        courseId: COURSE,
        title: 'Manual Text',
        sourceType: 'TEXT' as const,
        origin: 'manual',
        rawText: 'Hello from test',
      };

      const result = await service.createAndProcess(input);

      expect(mockProcessingService.createAndProcess).toHaveBeenCalledWith(
        input
      );
      expect(result).toEqual(PENDING_SOURCE);
    });

    it('propagates errors from processingService', async () => {
      mockProcessingService.createAndProcess.mockRejectedValueOnce(
        new Error('processing failed')
      );

      await expect(
        service.createAndProcess({
          tenantId: TENANT,
          courseId: COURSE,
          title: 'Bad source',
          sourceType: 'TEXT' as const,
          origin: 'manual',
          rawText: 'fail',
        })
      ).rejects.toThrow('processing failed');
    });
  });

  // ── deleteSource ──────────────────────────────────────────────────────────

  describe('deleteSource()', () => {
    it('deletes the source and returns void', async () => {
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockDelete.mockImplementation(buildDelete());

      await expect(
        service.deleteSource('ks-1', TENANT)
      ).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('throws NotFoundException if source does not exist', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      await expect(service.deleteSource('ghost', TENANT)).rejects.toThrow(
        NotFoundException
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ── updateSource ─────────────────────────────────────────────────────────

  describe('updateSource()', () => {
    it('updates title and returns updated source', async () => {
      const updated = { ...MOCK_SOURCE, title: 'New Title' };
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockUpdate.mockImplementation(buildUpdate(updated));

      const result = await service.updateSource('ks-1', TENANT, {
        title: 'New Title',
      });
      expect(result.title).toBe('New Title');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws NotFoundException if source does not exist', async () => {
      mockSelect.mockImplementation(buildSelect([]));
      await expect(
        service.updateSource('ghost', TENANT, { title: 'X' })
      ).rejects.toThrow(NotFoundException);
    });

    it('updates metadata when provided', async () => {
      const updated = { ...MOCK_SOURCE, metadata: { lang: 'he' } };
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockUpdate.mockImplementation(buildUpdate(updated));

      const result = await service.updateSource('ks-1', TENANT, {
        metadata: { lang: 'he' },
      });
      expect(result.metadata).toEqual({ lang: 'he' });
    });

    it('syncs AGE graph Source node when title is updated', async () => {
      const updated = { ...MOCK_SOURCE, title: 'Graph Sync Title' };
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockUpdate.mockImplementation(buildUpdate(updated));

      await service.updateSource('ks-1', TENANT, { title: 'Graph Sync Title' });

      expect(mockCreateSourceNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'ks-1',
          tenant_id: TENANT,
          name: 'Graph Sync Title',
        })
      );
    });

    it('does NOT sync AGE graph when only metadata is updated', async () => {
      const updated = { ...MOCK_SOURCE, metadata: { tag: 'math' } };
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockUpdate.mockImplementation(buildUpdate(updated));

      await service.updateSource('ks-1', TENANT, { metadata: { tag: 'math' } });

      expect(mockCreateSourceNode).not.toHaveBeenCalled();
    });

    it('still returns updated source when graph sync fails', async () => {
      const updated = { ...MOCK_SOURCE, title: 'Graph Down' };
      mockSelect.mockImplementation(buildSelect([MOCK_SOURCE]));
      mockUpdate.mockImplementation(buildUpdate(updated));
      mockCreateSourceNode.mockRejectedValueOnce(new Error('AGE unreachable'));

      const result = await service.updateSource('ks-1', TENANT, {
        title: 'Graph Down',
      });
      expect(result.title).toBe('Graph Down');
    });
  });

  // ── onModuleInit ──────────────────────────────────────────────────────────

  describe('onModuleInit()', () => {
    it('marks stale PENDING/PROCESSING sources as FAILED on startup', async () => {
      const failedSource = { ...MOCK_SOURCE, status: 'FAILED' as const };
      mockUpdate.mockImplementation(buildUpdate(failedSource));

      await service.onModuleInit();

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('does not throw when no stale sources exist', async () => {
      const returning = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });

      await expect(service.onModuleInit()).resolves.toBeUndefined();
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

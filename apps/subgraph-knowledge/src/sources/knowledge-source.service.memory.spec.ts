/**
 * knowledge-source.service.memory.spec.ts
 *
 * Memory-safety tests for KnowledgeSourceService.
 * Verifies:
 *   1. onModuleDestroy() calls closeAllPools() to release DB connections.
 *   2. onModuleDestroy() is idempotent (safe to call multiple times).
 *   3. Embedding failures do not leave dangling promises or grow the error queue.
 *   4. processSource() wraps all DB operations so a mid-process error still
 *      reaches the FAILED update path (no orphaned PROCESSING rows).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockCloseAllPools, mockDb } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

  const mockReturning = vi.fn().mockResolvedValue([
    {
      id: 'ks-mem-1',
      tenant_id: 't-1',
      course_id: 'c-1',
      title: 'Memory Test',
      source_type: 'TEXT',
      origin: 'manual',
      status: 'READY',
      raw_content: 'hello',
      chunk_count: 1,
      error_message: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const mockWhere = vi.fn().mockReturnValue({
    returning: mockReturning,
    orderBy: vi.fn().mockResolvedValue([]),
  });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

  const mockDb = {
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    update: vi.fn().mockReturnValue({ set: mockSet }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  };

  return { mockCloseAllPools, mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
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

const mockParser = {
  parseText: vi
    .fn()
    .mockReturnValue({ text: 'hello', wordCount: 1, metadata: {} }),
  parseUrl: vi
    .fn()
    .mockResolvedValue({ text: 'url text', wordCount: 2, metadata: {} }),
  parseDocx: vi
    .fn()
    .mockResolvedValue({ text: 'docx', wordCount: 1, metadata: {} }),
  chunkText: vi.fn().mockReturnValue([{ index: 0, text: 'chunk' }]),
};

const mockEmbeddings = {
  generateEmbedding: vi.fn().mockResolvedValue({ id: 'emb-1' }),
};

describe('KnowledgeSourceService — memory safety', () => {
  let service: KnowledgeSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations
    mockParser.parseText.mockReturnValue({
      text: 'hello',
      wordCount: 1,
      metadata: {},
    });
    mockParser.chunkText.mockReturnValue([{ index: 0, text: 'chunk' }]);
    mockEmbeddings.generateEmbedding.mockResolvedValue({ id: 'emb-1' });

    service = new KnowledgeSourceService(
      mockParser as any,
      mockEmbeddings as any
    );
  });

  // ── Test 1: onModuleDestroy releases DB pool ───────────────────────────────
  it('onModuleDestroy() calls closeAllPools()', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: onModuleDestroy is idempotent ──────────────────────────────────
  it('calling onModuleDestroy() twice does not throw', async () => {
    await service.onModuleDestroy();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  // ── Test 3: embedding failures do not throw (no dangling rejections) ───────
  it('createAndProcess() does not throw when all embeddings fail', async () => {
    mockEmbeddings.generateEmbedding.mockRejectedValue(
      new Error('provider unavailable')
    );

    // Ensure update resolves even for FAILED path
    const failedRow = {
      id: 'ks-mem-1',
      status: 'FAILED',
      tenant_id: 't-1',
      course_id: 'c-1',
      title: 'Test',
      source_type: 'TEXT',
      origin: 'manual',
      chunk_count: 0,
      error_message: null,
      metadata: {},
      raw_content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // insert returns PENDING row
    const pendingRow = { ...failedRow, status: 'PENDING' };
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([pendingRow]),
      }),
    });

    // update always returns the ready/failed row
    const readyRow = { ...failedRow, status: 'READY', chunk_count: 0 };
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([readyRow]),
        }),
      }),
    });

    // Should not throw — embedding errors are logged and counted, not re-thrown
    await expect(
      service.createAndProcess({
        tenantId: 't-1',
        courseId: 'c-1',
        title: 'Embed fail test',
        sourceType: 'TEXT',
        origin: 'manual',
        rawText: 'embed fail',
      })
    ).resolves.toBeDefined();
  });

  // ── Test 4: PROCESSING state is always resolved (no orphaned rows) ─────────
  it('createAndProcess() always reaches READY or FAILED even when parser throws', async () => {
    mockParser.parseText.mockImplementationOnce(() => {
      throw new Error('parser crash');
    });

    const pendingRow = {
      id: 'ks-orphan',
      status: 'PENDING',
      tenant_id: 't-1',
      course_id: 'c-1',
      title: 'Orphan test',
      source_type: 'TEXT',
      origin: 'manual',
      chunk_count: 0,
      error_message: null,
      metadata: {},
      raw_content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const failedRow = {
      ...pendingRow,
      status: 'FAILED',
      error_message: 'parser crash',
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([pendingRow]),
      }),
    });

    let updateCount = 0;
    mockDb.update.mockImplementation(() => {
      updateCount++;
      // First update → PROCESSING (no returning needed)
      // Second update → FAILED (returns failedRow)
      const row = updateCount >= 2 ? failedRow : pendingRow;
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([row]),
          }),
        }),
      };
    });

    const result = await service.createAndProcess({
      tenantId: 't-1',
      courseId: 'c-1',
      title: 'Orphan test',
      sourceType: 'TEXT',
      origin: 'manual',
      rawText: 'will fail',
    });

    // createAndProcess returns PENDING immediately; background task handles the rest
    expect(result.status).toBe('PENDING');

    // Flush background processing so processSource completes
    await new Promise<void>(resolve => setImmediate(resolve));

    // Must have reached terminal state — two updates: PROCESSING + FAILED
    expect(updateCount).toBeGreaterThanOrEqual(2);
  });
});

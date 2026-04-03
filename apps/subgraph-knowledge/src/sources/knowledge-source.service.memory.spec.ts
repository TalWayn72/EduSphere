/* Memory-safety tests for KnowledgeSourceService */
/**
 * knowledge-source.service.memory.spec.ts
 *
 * Memory-safety tests for KnowledgeSourceService.
 * Verifies:
 *   1. onModuleDestroy() calls closeAllPools() to release DB connections.
 *   2. onModuleDestroy() is idempotent (safe to call multiple times).
 *   3. createAndProcess() delegates without leaking (processing tests elsewhere).
 *   4. onModuleInit() marks stale sources as FAILED.
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
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

  const mockDb = {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) }),
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
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  inArray: vi.fn((col: unknown, vals: unknown[]) => ({ inArray: [col, vals] })),
}));

import { KnowledgeSourceService } from './knowledge-source.service.js';

const PENDING_SOURCE = {
  id: 'ks-mem-1',
  tenant_id: 't-1',
  course_id: 'c-1',
  status: 'PENDING',
};

const mockProcessingService = {
  createAndProcess: vi.fn().mockResolvedValue(PENDING_SOURCE),
};

describe('KnowledgeSourceService — memory safety', () => {
  let service: KnowledgeSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KnowledgeSourceService(mockProcessingService as never);
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

  // ── Test 3: createAndProcess delegates without throwing ─────────────────────
  it('createAndProcess() delegates to processingService', async () => {
    const result = await service.createAndProcess({
      tenantId: 't-1',
      courseId: 'c-1',
      title: 'Test',
      sourceType: 'TEXT',
      origin: 'manual',
      rawText: 'hello',
    });
    expect(mockProcessingService.createAndProcess).toHaveBeenCalled();
    expect(result).toEqual(PENDING_SOURCE);
  });

  // ── Test 4: onModuleInit marks stale sources ────────────────────────────────
  it('onModuleInit() marks stale sources as FAILED', async () => {
    await service.onModuleInit();
    expect(mockDb.update).toHaveBeenCalled();
  });
});

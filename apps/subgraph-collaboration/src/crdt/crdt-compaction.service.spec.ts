import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';

// ── Hoisted mocks ───────────────────────────────────────────────────────────

const {
  mockCloseAllPools,
  mockSelect,
  mockSelectDistinct,
  mockFrom,
  mockWhere,
  mockLimit,
  mockUpdate,
  mockSet,
  mockDelete,
  mockInsert,
} = vi.hoisted(() => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  const mockDelete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

  return {
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockSelect: vi.fn().mockReturnValue({ from: mockFrom }),
    mockSelectDistinct: vi.fn().mockReturnValue({ from: mockFrom }),
    mockFrom,
    mockWhere,
    mockLimit,
    mockUpdate: vi.fn().mockReturnValue({ set: mockSet }),
    mockSet,
    mockDelete,
    mockInsert: vi.fn(),
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    selectDistinct: mockSelectDistinct,
    update: mockUpdate,
    delete: mockDelete,
    insert: mockInsert,
  })),
  closeAllPools: mockCloseAllPools,
  schema: {
    collab_documents: {
      id: 'collab_documents.id',
      ydoc_snapshot: 'collab_documents.ydoc_snapshot',
    },
    crdt_updates: {
      id: 'crdt_updates.id',
      document_id: 'crdt_updates.document_id',
      update_data: 'crdt_updates.update_data',
      created_at: 'crdt_updates.created_at',
    },
  },
  eq: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  ScheduleModule: { forRoot: vi.fn() },
}));

import { CrdtCompactionService } from './crdt-compaction.service.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeYjsUpdate(key: string, value: string): Buffer {
  const doc = new Y.Doc();
  doc.getMap('root').set(key, value);
  const update = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();
  return update;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CrdtCompactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default chain returns
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
  });

  it('instantiates without error', () => {
    expect(() => new CrdtCompactionService()).not.toThrow();
  });

  it('uses default threshold of 7 days', () => {
    const service = new CrdtCompactionService();
    // Access private thresholdDays via cast
    expect((service as unknown as { thresholdDays: number }).thresholdDays).toBe(7);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    const service = new CrdtCompactionService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('runCompaction logs start and end', async () => {
    const service = new CrdtCompactionService();
    const logSpy = vi.spyOn(
      (service as unknown as { logger: { log: (...a: unknown[]) => void } }).logger,
      'log',
    );

    // findDocumentsWithOldUpdates returns empty
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([]),
    });

    await service.runCompaction();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CrdtCompaction] Starting daily CRDT compaction'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('0 document(s), 0 update(s) compacted'),
    );
  });

  it('runCompaction handles errors gracefully', async () => {
    const service = new CrdtCompactionService();
    const errorSpy = vi.spyOn(
      (service as unknown as { logger: { error: (...a: unknown[]) => void } }).logger,
      'error',
    );

    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockRejectedValue(new Error('DB down')),
    });

    await service.runCompaction();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CrdtCompaction] Compaction failed'),
    );
  });

  it('compactDocument returns 0 when document not found', async () => {
    const service = new CrdtCompactionService();
    const cutoff = new Date();

    // select().from().where().limit() returns empty
    mockLimit.mockResolvedValueOnce([]);

    const result = await service.compactDocument('nonexistent', cutoff);
    expect(result).toBe(0);
  });

  it('compactDocument returns 0 when no old updates exist', async () => {
    const service = new CrdtCompactionService();
    const cutoff = new Date();

    // First query: document exists
    mockLimit.mockResolvedValueOnce([
      { id: 'doc-1', ydocSnapshot: null },
    ]);
    // Second query: no old updates (via where on crdt_updates)
    mockWhere
      .mockReturnValueOnce({ limit: mockLimit }) // first call chain (doc lookup)
      .mockResolvedValueOnce([]); // second call chain (old updates)

    const result = await service.compactDocument('doc-1', cutoff);
    expect(result).toBe(0);
  });

  it('compactDocument merges updates into snapshot and deletes rows', async () => {
    const service = new CrdtCompactionService();
    const cutoff = new Date();

    const update1 = makeYjsUpdate('a', '1');
    const update2 = makeYjsUpdate('b', '2');

    // First query: document exists with null snapshot
    mockLimit.mockResolvedValueOnce([
      { id: 'doc-1', ydocSnapshot: null },
    ]);

    // Second query: old updates
    mockWhere
      .mockReturnValueOnce({ limit: mockLimit }) // doc lookup chain
      .mockResolvedValueOnce([
        { id: 'upd-1', updateData: update1 },
        { id: 'upd-2', updateData: update2 },
      ]);

    // update().set().where() for writing snapshot
    const mockSetWhere = vi.fn().mockResolvedValue(undefined);
    mockSet.mockReturnValueOnce({ where: mockSetWhere });

    // delete().where() for removing old rows
    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValueOnce({ where: mockDeleteWhere });

    const result = await service.compactDocument('doc-1', cutoff);

    expect(result).toBe(2);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('compactDocument preserves existing snapshot data during merge', async () => {
    const service = new CrdtCompactionService();
    const cutoff = new Date();

    // Create an existing snapshot
    const existingDoc = new Y.Doc();
    existingDoc.getMap('root').set('existing', 'data');
    const existingSnapshot = Buffer.from(Y.encodeStateAsUpdate(existingDoc));
    existingDoc.destroy();

    const newUpdate = makeYjsUpdate('new', 'value');

    // Doc with existing snapshot
    mockLimit.mockResolvedValueOnce([
      { id: 'doc-2', ydocSnapshot: existingSnapshot },
    ]);

    // One old update
    mockWhere
      .mockReturnValueOnce({ limit: mockLimit })
      .mockResolvedValueOnce([
        { id: 'upd-3', updateData: newUpdate },
      ]);

    const mockSetWhere = vi.fn().mockResolvedValue(undefined);
    mockSet.mockReturnValueOnce({ where: mockSetWhere });

    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValueOnce({ where: mockDeleteWhere });

    const result = await service.compactDocument('doc-2', cutoff);

    expect(result).toBe(1);
    // The snapshot was written (update was called)
    expect(mockUpdate).toHaveBeenCalled();
    // Verify the snapshot passed to set() contains both keys
    const setCall = mockSet.mock.calls[0];
    expect(setCall).toBeDefined();
    const snapshotArg = (setCall as Array<{ ydoc_snapshot: Buffer }>)[0]!.ydoc_snapshot;
    expect(snapshotArg).toBeInstanceOf(Buffer);

    // Decode and verify merged content
    const verifyDoc = new Y.Doc();
    Y.applyUpdate(verifyDoc, snapshotArg);
    const map = verifyDoc.getMap('root');
    expect(map.get('existing')).toBe('data');
    expect(map.get('new')).toBe('value');
    verifyDoc.destroy();
  });
});

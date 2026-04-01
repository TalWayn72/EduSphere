import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockCloseAllPools,
  mockSelect,
  mockFrom: _mockFrom,
  mockWhere,
  mockLimit,
} = vi.hoisted(() => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  return {
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockSelect: vi.fn().mockReturnValue({ from: mockFrom }),
    mockFrom,
    mockWhere,
    mockLimit,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
  })),
  closeAllPools: mockCloseAllPools,
  schema: {
    collab_documents: {
      id: 'collab_documents.id',
      name: 'collab_documents.name',
      ydoc_snapshot: 'collab_documents.ydoc_snapshot',
      createdAt: 'collab_documents.created_at',
      updatedAt: 'collab_documents.updated_at',
    },
  },
  eq: vi.fn(),
}));

vi.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  ScheduleModule: { forRoot: vi.fn() },
}));

import { CollabDocumentService } from './collab-document.service.js';

const MOCK_DOC = {
  id: 'doc-1',
  name: 'Test Document',
  ydoc_snapshot: Buffer.from([1, 2, 3]),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-03-30'),
};

describe('CollabDocumentService', () => {
  let service: CollabDocumentService;
  const mockCompactionService = {
    compactDocument: vi.fn().mockResolvedValue(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new CollabDocumentService(mockCompactionService as any);
  });

  it('instantiates without error', () => {
    expect(service).toBeDefined();
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when document not found', async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(service.compactDocument('nonexistent')).rejects.toThrow(
      'Document nonexistent not found'
    );
  });

  it('compacts document and returns result', async () => {
    // First call: document lookup (exists)
    mockLimit.mockResolvedValueOnce([MOCK_DOC]);
    // compactDocument returns count
    mockCompactionService.compactDocument.mockResolvedValueOnce(5);
    // Second call: re-fetch after compaction
    mockLimit.mockResolvedValueOnce([MOCK_DOC]);

    const result = await service.compactDocument('doc-1');

    expect(result.id).toBe('doc-1');
    expect(result.title).toBe('Test Document');
    expect(result.sizeBytes).toBe(3);
    expect(result.compactedAt).toBeInstanceOf(Date);
    expect(mockCompactionService.compactDocument).toHaveBeenCalledWith(
      'doc-1',
      expect.any(Date)
    );
  });

  it('handles document with no snapshot', async () => {
    const docNoSnapshot = { ...MOCK_DOC, ydoc_snapshot: null };
    mockLimit.mockResolvedValueOnce([docNoSnapshot]);
    mockCompactionService.compactDocument.mockResolvedValueOnce(0);
    mockLimit.mockResolvedValueOnce([docNoSnapshot]);

    const result = await service.compactDocument('doc-1');
    expect(result.sizeBytes).toBe(0);
  });
});

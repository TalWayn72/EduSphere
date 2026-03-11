import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mocks ──────────────────────────────────────────────────────────────────
const mockInsertValues = vi.fn().mockResolvedValue([]);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn(() => ({
  from: mockSelectFrom,
}));

const mockDB = {
  insert: mockInsert,
  select: mockSelect,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDB),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  gte: vi.fn((_col: unknown, _val: unknown) => ({ gte: true })),
  lte: vi.fn((_col: unknown, _val: unknown) => ({ lte: true })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  eq: vi.fn((_col: unknown, _val: unknown) => ({ eq: true })),
  count: vi.fn(() => ({ count: true })),
  sql: vi.fn(),
}));

vi.mock('@edusphere/db/schema', () => ({
  auditLog: {
    tenantId: 'tenant_id',
    action: 'action',
    createdAt: 'created_at',
    metadata: 'metadata',
  },
}));

import { GraphragAuditService } from './graphrag-audit.service.js';

describe('GraphragAuditService', () => {
  let service: GraphragAuditService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset select chain to return two rows with sample data
    const sampleRows = [
      {
        metadata: {
          confidenceScore: 0.9,
          sourceDocuments: ['doc-A', 'doc-B'],
        },
      },
      {
        metadata: {
          confidenceScore: 0.7,
          sourceDocuments: ['doc-A', 'doc-C'],
        },
      },
    ];

    mockSelectWhere.mockResolvedValue(sampleRows);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });

    service = new GraphragAuditService();
  });

  // ── recordQuery ──────────────────────────────────────────────────────────────

  it('recordQuery calls db.insert with action GRAPHRAG_QUERY', async () => {
    await service.recordQuery({
      queryId: 'q-001',
      tenantId: 'tenant-1',
      queryText: 'What is React?',
      graphPath: ['concept-A', 'concept-B'],
      sourceDocuments: ['doc-1'],
      modelVersion: '1.0.0',
      modelHash: 'abc123',
      answerText: 'React is a UI library.',
      confidenceScore: 0.95,
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'GRAPHRAG_QUERY',
        tenantId: 'tenant-1',
        resourceType: 'GRAPHRAG',
      })
    );
  });

  it('recordQuery stores all provenance fields in metadata', async () => {
    await service.recordQuery({
      queryId: 'q-002',
      tenantId: 'tenant-1',
      queryText: 'Explain GraphQL',
      graphPath: ['node-X'],
      sourceDocuments: ['src-1', 'src-2'],
      modelVersion: '2.0.0',
      modelHash: 'deadbeef',
      answerText: 'GraphQL is a query language.',
      confidenceScore: 0.88,
    });

    const insertedValues = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
    const meta = insertedValues['metadata'] as Record<string, unknown>;
    expect(meta['queryId']).toBe('q-002');
    expect(meta['modelHash']).toBe('deadbeef');
    expect(meta['confidenceScore']).toBe(0.88);
    expect(meta['sourceDocuments']).toEqual(['src-1', 'src-2']);
  });

  // ── Immutability ─────────────────────────────────────────────────────────────

  it('service has no update or delete methods (immutability invariant)', () => {
    // Casting to unknown to inspect all keys without TypeScript complaints
    const keys = Object.getOwnPropertyNames(
      Object.getPrototypeOf(service)
    );
    const mutatingMethods = keys.filter(
      (k) => k.toLowerCase().includes('update') || k.toLowerCase().includes('delete')
    );
    expect(mutatingMethods).toHaveLength(0);
  });

  // ── generateAuditSummary ─────────────────────────────────────────────────────

  it('generateAuditSummary returns correct shape', async () => {
    const result = await service.generateAuditSummary(
      'tenant-1',
      new Date('2024-01-01'),
      new Date('2024-12-31')
    );

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('avgConfidence');
    expect(result).toHaveProperty('topSources');
    expect(Array.isArray(result.topSources)).toBe(true);
  });

  it('generateAuditSummary returns zero totals when no rows exist', async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await service.generateAuditSummary(
      'tenant-empty',
      new Date('2024-01-01'),
      new Date('2024-12-31')
    );

    expect(result.total).toBe(0);
    expect(result.avgConfidence).toBe(0);
    expect(result.topSources).toEqual([]);
  });

  // ── onModuleDestroy ──────────────────────────────────────────────────────────

  it('onModuleDestroy calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });
});

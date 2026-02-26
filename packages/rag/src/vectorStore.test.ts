import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PgVectorStore,
  createVectorStore,
  VectorDocument,
  SearchResult,
} from './vectorStore';

// ---------------------------------------------------------------------------
// We intercept Pool at the module level; each test creates its own mock pool
// object and passes it via the captured Pool constructor.
// ---------------------------------------------------------------------------
const mockPoolQuery = vi.fn();
const mockPoolEnd = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();
const mockPoolConnect = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockPoolQuery,
    connect: mockPoolConnect,
    end: mockPoolEnd,
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeFakeEmbedding(seed = 0): number[] {
  return Array.from({ length: 3 }, (_, i) => (i + seed) * 0.1);
}

function makeVectorDoc(
  overrides: Partial<VectorDocument> = {}
): VectorDocument {
  return {
    id: 'doc-1',
    content: 'This is test content',
    embedding: makeFakeEmbedding(),
    metadata: { source: 'test.pdf', page: 1 },
    tenantId: 'tenant-abc',
    ...overrides,
  };
}

function makeSearchRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'result-1',
    content: 'Result content',
    metadata: { source: 'result.pdf' },
    similarity: '0.87',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PgVectorStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default behaviour: queries succeed with empty rows
    mockPoolQuery.mockResolvedValue({ rows: [] });
    mockPoolEnd.mockResolvedValue(undefined);
    mockClientQuery.mockResolvedValue({ rows: [] });
    mockClientRelease.mockReturnValue(undefined);
    mockPoolConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  describe('constructor and factory', () => {
    it('creates PgVectorStore instance', () => {
      const store = new PgVectorStore('postgresql://test');
      expect(store).toBeInstanceOf(PgVectorStore);
    });

    it('factory createVectorStore returns PgVectorStore', () => {
      const store = createVectorStore('postgresql://test');
      expect(store).toBeInstanceOf(PgVectorStore);
    });

    it('factory accepts tableName and dimensions overrides', () => {
      const store = createVectorStore(
        'postgresql://test',
        'custom_table',
        1536
      );
      expect(store).toBeInstanceOf(PgVectorStore);
    });

    it('constructs Pool with provided connection string', async () => {
      const { Pool } = await import('pg');
      const MockPool = vi.mocked(Pool);
      MockPool.mockClear();

      const connStr = 'postgresql://user:pass@localhost:5432/db';
      new PgVectorStore(connStr);
      expect(MockPool).toHaveBeenCalledWith({ connectionString: connStr });
    });
  });

  describe('initialize()', () => {
    it('creates the vector extension', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.initialize();

      const calls: string[] = mockPoolQuery.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some((q) => q.includes('CREATE EXTENSION IF NOT EXISTS vector'))
      ).toBe(true);
    });

    it('creates the documents table with correct table name', async () => {
      const store = new PgVectorStore('postgresql://test', 'my_docs', 768);
      await store.initialize();

      const calls: string[] = mockPoolQuery.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some((q) => q.includes('CREATE TABLE IF NOT EXISTS my_docs'))
      ).toBe(true);
    });

    it('creates HNSW index on embedding column', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.initialize();

      const calls: string[] = mockPoolQuery.mock.calls.map((c) => String(c[0]));
      expect(calls.some((q) => q.includes('hnsw'))).toBe(true);
    });

    it('creates tenant_id index', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.initialize();

      const calls: string[] = mockPoolQuery.mock.calls.map((c) => String(c[0]));
      expect(
        calls.some(
          (q) =>
            q.toLowerCase().includes('tenant_id') && q.includes('CREATE INDEX')
        )
      ).toBe(true);
    });

    it('makes exactly 4 pool.query calls during initialization', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.initialize();

      // extension + table + HNSW index + tenant index = 4 calls
      expect(mockPoolQuery).toHaveBeenCalledTimes(4);
    });
  });

  describe('addDocument()', () => {
    it('inserts a document with correct parameters', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const doc = makeVectorDoc();
      await store.addDocument(doc);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vector_documents'),
        [
          doc.id,
          doc.content,
          JSON.stringify(doc.embedding),
          JSON.stringify(doc.metadata),
          doc.tenantId,
        ]
      );
    });

    it('uses ON CONFLICT DO UPDATE (upsert) semantics', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.addDocument(makeVectorDoc());

      const queryStr = String(mockPoolQuery.mock.calls[0]![0]);
      expect(queryStr).toContain('ON CONFLICT (id) DO UPDATE');
    });

    it('serializes embedding as JSON string for pgvector', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const embedding = [0.1, 0.2, 0.3];
      await store.addDocument(makeVectorDoc({ embedding }));

      const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
      expect(params[2]).toBe(JSON.stringify(embedding));
    });

    it('passes tenant_id as the 5th parameter', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.addDocument(makeVectorDoc({ tenantId: 'my-tenant' }));

      const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
      expect(params[4]).toBe('my-tenant');
    });
  });

  describe('addDocuments()', () => {
    it('uses a transaction (BEGIN/COMMIT) for batch inserts', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const docs = [makeVectorDoc({ id: 'a' }), makeVectorDoc({ id: 'b' })];
      await store.addDocuments(docs);

      const queries: string[] = mockClientQuery.mock.calls.map((c) =>
        String(c[0])
      );
      expect(queries).toContain('BEGIN');
      expect(queries).toContain('COMMIT');
    });

    it('calls connect() on the pool to get a client', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.addDocuments([makeVectorDoc()]);

      expect(mockPoolConnect).toHaveBeenCalledOnce();
    });

    it('releases the client after successful batch insert', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.addDocuments([makeVectorDoc()]);

      expect(mockClientRelease).toHaveBeenCalledOnce();
    });

    it('rolls back on error during batch insert', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB write error')); // first INSERT fails

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await expect(
        store.addDocuments([makeVectorDoc({ id: 'fail-doc' })])
      ).rejects.toThrow('DB write error');

      const queries: string[] = mockClientQuery.mock.calls.map((c) =>
        String(c[0])
      );
      expect(queries).toContain('ROLLBACK');
    });

    it('releases the client even on error', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('fail'));

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.addDocuments([makeVectorDoc()]).catch(() => undefined);

      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe('similaritySearch()', () => {
    it('returns search results with id, content, metadata, similarity', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          makeSearchRow(),
          makeSearchRow({ id: 'result-2', similarity: '0.72' }),
        ],
      });

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const results = await store.similaritySearch(
        makeFakeEmbedding(),
        'tenant-abc',
        5,
        0.5
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe('result-1');
      expect(results[0]!.similarity).toBe(0.87);
    });

    it('filters by tenant_id in the WHERE clause', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.similaritySearch(makeFakeEmbedding(), 'my-tenant', 5, 0.5);

      const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
      expect(params[1]).toBe('my-tenant');
    });

    it('applies similarity threshold from parameters', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.similaritySearch(makeFakeEmbedding(), 'tenant-abc', 10, 0.75);

      const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
      expect(params[2]).toBe(0.75);
    });

    it('applies limit from parameters', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.similaritySearch(makeFakeEmbedding(), 'tenant-abc', 7, 0.5);

      const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
      expect(params[3]).toBe(7);
    });

    it('parses similarity as float from string DB output', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [makeSearchRow({ similarity: '0.654321' })],
      });

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const results: SearchResult[] = await store.similaritySearch(
        makeFakeEmbedding(),
        'tenant-abc',
        5,
        0.5
      );

      expect(typeof results[0]!.similarity).toBe('number');
      expect(results[0]!.similarity).toBeCloseTo(0.654321);
    });

    it('returns empty array when no results match threshold', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const results = await store.similaritySearch(
        makeFakeEmbedding(),
        'tenant-abc',
        5,
        0.99
      );

      expect(results).toHaveLength(0);
    });

    it('passes embedding as JSON string in query params', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] });
      const embedding = [0.1, 0.2, 0.3];

      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.similaritySearch(embedding, 'tenant-abc', 5, 0.5);

      const params = mockPoolQuery.mock.calls[0]![1] as unknown[];
      expect(params[0]).toBe(JSON.stringify(embedding));
    });
  });

  describe('deleteDocument()', () => {
    it('deletes by id and tenantId', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.deleteDocument('doc-123', 'tenant-abc');

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM vector_documents'),
        ['doc-123', 'tenant-abc']
      );
    });
  });

  describe('deleteByMetadata()', () => {
    it('deletes documents matching metadata filter and tenantId', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      const meta = { courseId: 'course-001' };
      await store.deleteByMetadata(meta, 'tenant-xyz');

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('metadata @> $1::jsonb'),
        [JSON.stringify(meta), 'tenant-xyz']
      );
    });
  });

  describe('close()', () => {
    it('ends the connection pool', async () => {
      const store = new PgVectorStore(
        'postgresql://test',
        'vector_documents',
        768
      );
      await store.close();

      expect(mockPoolEnd).toHaveBeenCalledOnce();
    });
  });
});

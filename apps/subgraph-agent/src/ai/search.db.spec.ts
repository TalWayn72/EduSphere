/**
 * search.db.spec.ts
 * Unit tests for searchKnowledgeGraph — pgvector + ILIKE hybrid search.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockExecute = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const _mockLimit = vi.fn();
const mockWithTenantContext = vi.fn();
const mockCreateDatabaseConnection = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockCreateDatabaseConnection(),
  schema: {
    transcript_segments: {
      id: 'ts.id',
      text: 'ts.text',
    },
  },
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

vi.mock('drizzle-orm', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    __sql: true,
    strings,
    values,
  }),
}));

vi.mock('@nestjs/common', () => {
  class MockLogger {
    debug = vi.fn();
    warn = vi.fn();
    error = vi.fn();
  }
  return { Logger: MockLogger };
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { searchKnowledgeGraph, type RagConfig } from './search.db.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-abc';

function setupDbMock(vectorRows: unknown[] = []) {
  const db = { execute: mockExecute };
  mockCreateDatabaseConnection.mockReturnValue(db);
  // First call = transcript_segments pgvector query, second call = knowledge_source_chunk_embeddings query (returns empty)
  mockExecute
    .mockResolvedValueOnce({ rows: vectorRows })
    .mockResolvedValue({ rows: [] });
}

function setupIlikeMock(ilikeRows: Array<{ id: string; text: string }> = []) {
  mockWithTenantContext.mockImplementation(
    async (
      _db: unknown,
      _ctx: unknown,
      fn: (tx: unknown) => Promise<unknown>
    ) => {
      const tx = {
        select: () => {
          mockSelect();
          return {
            from: () => {
              mockFrom();
              return {
                where: () => {
                  mockWhere();
                  return { limit: () => ilikeRows };
                },
              };
            },
          };
        },
      };
      return fn(tx);
    }
  );
}

describe('searchKnowledgeGraph', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OLLAMA_URL = 'http://localhost:11434';
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns pgvector results when embedding succeeds', async () => {
    const embedding = Array.from({ length: 768 }, () => 0.1);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    setupDbMock([
      { segment_id: 'seg-1', text: 'Relevant text', similarity: '0.92' },
    ]);
    setupIlikeMock([]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'seg-1',
      text: 'Relevant text',
      type: 'transcript_segment',
    });
    expect(results[0].similarity).toBeCloseTo(0.46, 1); // 0.92 * 0.5
  });

  it('falls back to ILIKE when embedding provider is unavailable', async () => {
    delete process.env.OLLAMA_URL;
    delete process.env.OPENAI_API_KEY;

    setupDbMock();
    setupIlikeMock([{ id: 'seg-2', text: 'Fallback match from ILIKE' }]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'seg-2',
      type: 'transcript_segment',
      similarity: 0,
    });
  });

  it('deduplicates ILIKE results against pgvector results', async () => {
    const embedding = [0.1, 0.2, 0.3];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    setupDbMock([
      { segment_id: 'seg-dup', text: 'Duplicate', similarity: '0.8' },
    ]);
    setupIlikeMock([
      { id: 'seg-dup', text: 'Duplicate again' }, // should be deduped
      { id: 'seg-new', text: 'New result' },
    ]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    const ids = results.map((r) => r.id);
    expect(ids).toContain('seg-dup');
    expect(ids).toContain('seg-new');
    // seg-dup should appear only once
    expect(ids.filter((id) => id === 'seg-dup')).toHaveLength(1);
  });

  it('respects limit parameter', async () => {
    const embedding = [0.1];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    const vectorRows = Array.from({ length: 5 }, (_, i) => ({
      segment_id: `seg-${i}`,
      text: `Text ${i}`,
      similarity: '0.9',
    }));
    setupDbMock(vectorRows);
    setupIlikeMock([]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 3);

    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('applies ragConfig weights to similarity scores', async () => {
    const embedding = [0.1];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    setupDbMock([
      { segment_id: 'seg-w', text: 'Weighted', similarity: '0.80' },
    ]);
    setupIlikeMock([]);

    const ragConfig: RagConfig = { vectorWeight: 0.7, graphWeight: 0.3 };
    const results = await searchKnowledgeGraph(
      'query',
      TENANT_ID,
      5,
      ragConfig
    );

    expect(results[0].similarity).toBeCloseTo(0.56, 1); // 0.8 * 0.7
  });

  it('truncates text to 200 characters', async () => {
    const embedding = [0.1];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    const longText = 'A'.repeat(500);
    setupDbMock([
      { segment_id: 'seg-long', text: longText, similarity: '0.9' },
    ]);
    setupIlikeMock([]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    expect(results[0].text.length).toBe(200);
  });

  it('handles pgvector query failure gracefully', async () => {
    const embedding = [0.1];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    mockCreateDatabaseConnection.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error('pg down')),
    });
    setupIlikeMock([{ id: 'seg-fb', text: 'Fallback' }]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('seg-fb');
  });

  it('uses OpenAI embedding when OPENAI_API_KEY is set', async () => {
    delete process.env.OLLAMA_URL;
    process.env.OPENAI_API_KEY = 'sk-test';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2] }],
      }),
    });

    setupDbMock([
      { segment_id: 'seg-oai', text: 'OpenAI embed', similarity: '0.85' },
    ]);
    setupIlikeMock([]);

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    expect(results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      })
    );
  });

  it('returns empty array when both phases fail', async () => {
    mockFetch.mockRejectedValueOnce(new Error('embedding fail'));
    setupDbMock();
    mockWithTenantContext.mockRejectedValue(new Error('ILIKE fail'));

    const results = await searchKnowledgeGraph('query', TENANT_ID, 5);

    expect(results).toEqual([]);
  });
});

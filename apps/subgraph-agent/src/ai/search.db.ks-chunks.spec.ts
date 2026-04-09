/**
 * search.db.ks-chunks.spec.ts
 * Tests for knowledge source chunk text retrieval in searchKnowledgeGraph.
 * Covers the Phase 1b path that returns actual chunk_text instead of a placeholder.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockExecute = vi.fn();
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

import { searchKnowledgeGraph } from './search.db.js';

const TENANT_ID = 'tenant-ks-chunks';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OLLAMA_URL = 'http://localhost:11434';
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  delete process.env.OLLAMA_URL;
  delete process.env.OPENAI_API_KEY;
});

describe('searchKnowledgeGraph — knowledge source chunk_text (Phase 1b)', () => {
  it('returns actual chunk_text instead of source title placeholder', async () => {
    const embedding = Array.from({ length: 768 }, () => 0.1);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    const db = { execute: mockExecute };
    mockCreateDatabaseConnection.mockReturnValue(db);

    // Phase 1 — transcript_segments: empty (forces Phase 1b to contribute results)
    // Phase 1b — knowledge_source_chunk_embeddings: one row with real chunk_text
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            source_id: 'ks-src-1',
            chunk_index: 0,
            chunk_text: 'Photosynthesis converts sunlight into chemical energy',
            source_title: 'Biology Notes',
            similarity: '0.91',
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    mockWithTenantContext.mockImplementation(
      async (
        _db: unknown,
        _ctx: unknown,
        fn: (tx: unknown) => Promise<unknown>
      ) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({ limit: () => [] }),
            }),
          }),
        };
        return fn(tx);
      }
    );

    const results = await searchKnowledgeGraph('photosynthesis', TENANT_ID, 5);

    const ksResult = results.find((r) => r.type === 'knowledge_source_chunk');
    expect(ksResult).toBeDefined();
    expect(ksResult!.text).toBe(
      'Photosynthesis converts sunlight into chemical energy'
    );
    expect(ksResult!.id).toBe('ks:ks-src-1:0');
  });

  it('truncates long chunk_text to 200 characters', async () => {
    const embedding = [0.1];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding }),
    });

    const db = { execute: mockExecute };
    mockCreateDatabaseConnection.mockReturnValue(db);
    const longChunkText = 'X'.repeat(500);

    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            source_id: 'ks-src-2',
            chunk_index: 0,
            chunk_text: longChunkText,
            source_title: 'Long Source',
            similarity: '0.85',
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    mockWithTenantContext.mockImplementation(
      async (
        _db: unknown,
        _ctx: unknown,
        fn: (tx: unknown) => Promise<unknown>
      ) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({ limit: () => [] }),
            }),
          }),
        };
        return fn(tx);
      }
    );

    const results = await searchKnowledgeGraph('topic', TENANT_ID, 5);

    const ksResult = results.find((r) => r.type === 'knowledge_source_chunk');
    expect(ksResult).toBeDefined();
    expect(ksResult!.text.length).toBe(200);
  });
});

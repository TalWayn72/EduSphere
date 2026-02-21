/**
 * Unit tests for ai.service.db — searchKnowledgeGraph and fetchContentItem.
 *
 * All external dependencies (createDatabaseConnection, withTenantContext,
 * global fetch) are mocked so these tests run without a real database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

// Mutable references that individual tests can reconfigure per-call.
let withTenantContextImpl: (
  _db: unknown,
  _ctx: unknown,
  op: (tx: unknown) => Promise<unknown>
) => Promise<unknown>;

let dbExecuteImpl: Mock;
let _txSelectImpl: Mock;

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    get execute() {
      return dbExecuteImpl;
    },
    select: vi.fn(),
  })),
  withTenantContext: vi.fn((...args: unknown[]) => {
    const [db, ctx, op] = args as [
      unknown,
      unknown,
      (tx: unknown) => Promise<unknown>,
    ];
    return withTenantContextImpl(db, ctx, op);
  }),
  schema: {
    transcript_segments: { id: 'ts_id_col', text: 'ts_text_col' },
    contentItems: {
      id: 'ci_id_col',
      title: 'ci_title_col',
      type: 'ci_type_col',
      content: 'ci_content_col',
    },
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ op: 'eq' })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: String(strings[0]),
      values,
    }),
    { raw: (s: string) => ({ sql: s }) },
  ),
}));

// ── System under test ─────────────────────────────────────────────────────────
import { searchKnowledgeGraph } from './search.db';
import { fetchContentItem } from './content.db';

// ── Constants ─────────────────────────────────────────────────────────────────
const TENANT = 'tenant-aaa';
const ITEM_ID = '123e4567-e89b-12d3-a456-426614174000';

// ── Helper: build a fluent Drizzle-like select chain ─────────────────────────
function buildSelectChain(rows: unknown[]) {
  const limitFn = vi.fn().mockResolvedValue(rows);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn });
  const selectFn = vi.fn().mockReturnValue({ from: fromFn });
  return {
    selectFn,
    tx: { select: selectFn } as unknown as Record<string, unknown>,
  };
}

// ── searchKnowledgeGraph ──────────────────────────────────────────────────────

describe('searchKnowledgeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    dbExecuteImpl = vi.fn();
    _txSelectImpl = vi.fn();
  });

  it('returns vector results when Ollama responds', async () => {
    process.env.OLLAMA_URL = 'http://localhost:11434';
    delete process.env.OPENAI_API_KEY;

    // Ollama embedding call succeeds
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: Array(768).fill(0.1) }),
    });

    // pgvector raw execute result
    dbExecuteImpl = vi.fn().mockResolvedValue([
      { segment_id: 'seg-1', text: 'photosynthesis occurs in chloroplasts', similarity: '0.92' },
      { segment_id: 'seg-2', text: 'light reactions in thylakoid', similarity: '0.85' },
    ]);

    // ILIKE fallback (remaining=0 so should not be called, but set up anyway)
    const { tx } = buildSelectChain([]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const results = await searchKnowledgeGraph('photosynthesis', TENANT, 2);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'seg-1',
      type: 'transcript_segment',
      similarity: 0.92,
    });
    expect(results[1]).toMatchObject({ id: 'seg-2', similarity: 0.85 });
  });

  it('falls back to ILIKE when Ollama returns non-ok status', async () => {
    process.env.OLLAMA_URL = 'http://localhost:11434';
    delete process.env.OPENAI_API_KEY;

    // Ollama fails
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    // ILIKE returns results
    const { tx } = buildSelectChain([
      { id: 'seg-ilike-1', text: 'algebra fundamentals' },
      { id: 'seg-ilike-2', text: 'algebraic expressions' },
    ]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const results = await searchKnowledgeGraph('algebra', TENANT, 5);

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0]).toMatchObject({ id: 'seg-ilike-1', type: 'transcript_segment', similarity: 0 });
  });

  it('falls back to ILIKE when no embedding provider is configured', async () => {
    delete process.env.OLLAMA_URL;
    delete process.env.OPENAI_API_KEY;

    const { tx } = buildSelectChain([{ id: 'seg-3', text: 'calculus derivatives' }]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const results = await searchKnowledgeGraph('calculus', TENANT, 5);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'seg-3', similarity: 0 });
    // fetch should NOT have been called (no provider configured)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('deduplicates results across vector and ILIKE phases', async () => {
    process.env.OLLAMA_URL = 'http://localhost:11434';

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: Array(768).fill(0.5) }),
    });

    // Vector returns seg-1 and seg-2
    dbExecuteImpl = vi.fn().mockResolvedValue([
      { segment_id: 'seg-1', text: 'mitochondria powerhouse', similarity: '0.9' },
      { segment_id: 'seg-2', text: 'cell membrane structure', similarity: '0.8' },
    ]);

    // ILIKE returns seg-1 (duplicate) and seg-3 (new)
    const { tx } = buildSelectChain([
      { id: 'seg-1', text: 'mitochondria powerhouse' },
      { id: 'seg-3', text: 'mitochondria and respiration' },
    ]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const results = await searchKnowledgeGraph('mitochondria', TENANT, 5);

    const ids = results.map((r) => r.id);
    expect(ids).toContain('seg-1');
    expect(ids).toContain('seg-2');
    expect(ids).toContain('seg-3');
    // seg-1 must appear only once
    expect(ids.filter((id) => id === 'seg-1')).toHaveLength(1);
  });

  it('returns at most limit results', async () => {
    process.env.OLLAMA_URL = 'http://localhost:11434';

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: Array(768).fill(0.1) }),
    });

    dbExecuteImpl = vi.fn().mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        segment_id: `seg-${i}`,
        text: `content ${i}`,
        similarity: String(0.9 - i * 0.05),
      })),
    );

    const { tx } = buildSelectChain([]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const results = await searchKnowledgeGraph('topic', TENANT, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('truncates snippet to 200 characters', async () => {
    delete process.env.OLLAMA_URL;
    delete process.env.OPENAI_API_KEY;

    const longText = 'a'.repeat(300);
    const { tx } = buildSelectChain([{ id: 'seg-long', text: longText }]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const results = await searchKnowledgeGraph('aaa', TENANT, 1);
    expect(results[0]?.text.length).toBeLessThanOrEqual(200);
  });

  it('returns empty array when both phases fail', async () => {
    process.env.OLLAMA_URL = 'http://localhost:11434';

    // Embedding network error
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    // ILIKE also throws
    withTenantContextImpl = async () => {
      throw new Error('DB error');
    };

    const results = await searchKnowledgeGraph('failing query', TENANT, 5);
    expect(results).toEqual([]);
  });
});

// ── fetchContentItem ──────────────────────────────────────────────────────────

describe('fetchContentItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped ContentItemResult when item is found', async () => {
    const { tx } = buildSelectChain([
      {
        id: ITEM_ID,
        title: 'Introduction to Biology',
        type: 'VIDEO',
        content: 'This video covers the basics of cell biology.',
      },
    ]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const result = await fetchContentItem(ITEM_ID, TENANT);

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: ITEM_ID,
      title: 'Introduction to Biology',
      type: 'VIDEO',
    });
  });

  it('returns null when item does not exist', async () => {
    const { tx } = buildSelectChain([]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const result = await fetchContentItem(ITEM_ID, TENANT);
    expect(result).toBeNull();
  });

  it('truncates content to 500 characters', async () => {
    const longContent = 'x'.repeat(800);
    const { tx } = buildSelectChain([
      { id: ITEM_ID, title: 'Long Item', type: 'MARKDOWN', content: longContent },
    ]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const result = await fetchContentItem(ITEM_ID, TENANT);
    expect(result?.content?.length).toBeLessThanOrEqual(500);
  });

  it('returns null content when content field is null', async () => {
    const { tx } = buildSelectChain([
      { id: ITEM_ID, title: 'Quiz', type: 'QUIZ', content: null },
    ]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const result = await fetchContentItem(ITEM_ID, TENANT);
    expect(result?.content).toBeNull();
  });

  it('returns null when withTenantContext throws (RLS violation)', async () => {
    withTenantContextImpl = async () => {
      throw new Error('RLS violation');
    };

    const result = await fetchContentItem(ITEM_ID, TENANT);
    expect(result).toBeNull();
  });

  it('passes tenantId to withTenantContext for RLS enforcement', async () => {
    const { tx } = buildSelectChain([]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    await fetchContentItem(ITEM_ID, 'tenant-xyz');

    const { withTenantContext } = await import('@edusphere/db');
    expect(withTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-xyz' }),
      expect.any(Function),
    );
  });

  it('returns correct type field from DB row', async () => {
    const { tx } = buildSelectChain([
      { id: ITEM_ID, title: 'PDF Handout', type: 'PDF', content: 'Page 1...' },
    ]);
    withTenantContextImpl = async (_db, _ctx, op) => op(tx);

    const result = await fetchContentItem(ITEM_ID, TENANT);
    expect(result?.type).toBe('PDF');
  });
});

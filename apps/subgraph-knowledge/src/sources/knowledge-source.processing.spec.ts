/**
 * knowledge-source.processing.spec.ts — Text-tracing tests
 *
 * "העקב לטקסט" — traces the text through every stage of the processing pipeline:
 *   File/URL/paste → parse() → chunk() → embed() → raw_content in DB
 *
 * Verifies:
 *  1. createAndProcess() returns PENDING immediately (non-blocking)
 *  2. Background processSource() transitions: PENDING → PROCESSING → READY
 *  3. raw_content is populated with the extracted text
 *  4. chunk_count reflects the number of successfully embedded chunks
 *  5. On embedding failure, source is still READY (text stored, chunk_count=0)
 *  6. On parse failure, source is FAILED with error_message set
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock @edusphere/db so no real DB connection is opened ────────────────────

type FakeSource = {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  source_type: string;
  origin: string;
  status: string;
  raw_content: string | null;
  chunk_count: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
};

function makeFakeSource(overrides?: Partial<FakeSource>): FakeSource {
  return {
    id: 'src-test-1',
    tenant_id: 'tenant-1',
    course_id: 'course-1',
    title: 'Test Source',
    source_type: 'FILE_DOCX',
    origin: 'test.docx',
    status: 'PENDING',
    raw_content: null,
    chunk_count: null,
    error_message: null,
    metadata: {},
    created_at: new Date(),
    ...overrides,
  };
}

// Drizzle-like chainable mock
function makeDbMock(opts: {
  insertRow: FakeSource;
  updateRows: FakeSource[];
}) {
  let updateIdx = 0;

  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [opts.insertRow]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((setArg: Record<string, unknown>) => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => {
            const row = { ...(opts.updateRows[updateIdx++] ?? opts.insertRow), ...setArg };
            return [row];
          }),
          // For the timeout-guard path that doesn't call .returning()
          catch: vi.fn(async () => undefined),
        })),
      })),
    })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
  };
}

vi.mock('@edusphere/db', async () => {
  return {
    createDatabaseConnection: vi.fn(() => ({})), // db is replaced per-test
    closeAllPools: vi.fn(async () => undefined),
    schema: { knowledgeSources: 'knowledgeSources' },
    eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
    and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
    inArray: vi.fn((col: unknown, vals: unknown[]) => ({ col, vals, op: 'in' })),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

type SetCall = Record<string, unknown>;

function extractSetCalls(db: ReturnType<typeof makeDbMock>): SetCall[] {
  return db.update.mock.results.flatMap(
    (r: { value: { set: ReturnType<typeof vi.fn> } }) =>
      r.value?.set?.mock?.calls?.map((c: [SetCall]) => c[0]) ?? []
  );
}

// ── Service builder ──────────────────────────────────────────────────────────

async function buildService(opts: {
  extractedText: string;
  embeddingError?: boolean;
  parseError?: boolean;
}) {
  const { KnowledgeSourceService } = await import('./knowledge-source.service.js');

  const insertRow = makeFakeSource({ status: 'PENDING' });
  const processingRow = makeFakeSource({ status: 'PROCESSING' });
  const readyRow = makeFakeSource({
    status: opts.parseError ? 'FAILED' : 'READY',
    raw_content: opts.parseError ? null : opts.extractedText,
    chunk_count: opts.embeddingError ? 0 : 2,
    error_message: opts.parseError ? 'Parse error: bad DOCX' : null,
  });

  const db = makeDbMock({ insertRow, updateRows: [processingRow, readyRow] });

  const parser = {
    parseDocx: opts.parseError
      ? vi.fn().mockRejectedValue(new Error('Parse error: bad DOCX'))
      : vi.fn().mockResolvedValue({
          text: opts.extractedText,
          wordCount: opts.extractedText.split(/\s+/).length,
          metadata: { source_type: 'FILE_DOCX' },
        }),
    parsePdf: vi.fn(),
    parseText: vi.fn().mockImplementation((t: string) => ({
      text: t,
      wordCount: t.split(/\s+/).length,
      metadata: {},
    })),
    parseUrl: vi.fn(),
    parseYoutube: vi.fn(),
    chunkText: vi.fn().mockReturnValue([
      { index: 0, text: opts.extractedText.slice(0, 100) || 'chunk0' },
      { index: 1, text: opts.extractedText.slice(100) || 'chunk1' },
    ]),
  };

  const embeddings = {
    generateEmbedding: opts.embeddingError
      ? vi.fn().mockRejectedValue(new Error('No embedding provider'))
      : vi.fn().mockResolvedValue({ id: 'emb-1', segmentId: 'ks:src-1:0' }),
  };

  const svc = new KnowledgeSourceService(parser as never, embeddings as never);
  // Override db after construction (constructor receives mock from vi.mock above)
  Object.defineProperty(svc, 'db', { value: db, writable: true });

  return { svc, db, parser, embeddings };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('KnowledgeSourceService — text-tracing pipeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── 1. Non-blocking return ──────────────────────────────────────────────────

  it('createAndProcess() returns PENDING immediately without awaiting embedding', async () => {
    const { svc } = await buildService({
      extractedText: 'ספר נהר שלום — הרש"ש. פרק ראשון בדברי קבלה.',
    });

    const result = await svc.createAndProcess({
      tenantId: 'tenant-1',
      courseId: 'course-1',
      title: 'נהר שלום',
      sourceType: 'FILE_DOCX',
      origin: 'nahar-shalom.docx',
      fileBuffer: Buffer.from('fake-docx'),
    });

    // Must return PENDING — not blocked by embedding
    expect(result.status).toBe('PENDING');
  });

  // ── 2. Text flows into raw_content (the core "עקב" assertion) ──────────────

  it('extracted text is stored verbatim in raw_content after processing', async () => {
    const EXTRACTED = 'בראשית ברא אלהים את השמים ואת הארץ. והארץ היתה תוהו ובוהו.';
    const { svc, db } = await buildService({ extractedText: EXTRACTED });

    await svc.createAndProcess({
      tenantId: 't1', courseId: 'c1', title: 'src',
      sourceType: 'FILE_DOCX', origin: 'bereishit.docx',
      fileBuffer: Buffer.from('docx-buf'),
    });
    await vi.runAllTimersAsync();

    const setCalls = extractSetCalls(db);
    const readyCall = setCalls.find((c) => c['status'] === 'READY');

    expect(readyCall).toBeDefined();
    expect(readyCall!['raw_content']).toBe(EXTRACTED);
  });

  // ── 3. Status transitions: PENDING → PROCESSING → READY ────────────────────

  it('status transitions through PENDING → PROCESSING → READY', async () => {
    const { svc, db } = await buildService({ extractedText: 'הלכות תשובה פרק א.' });

    await svc.createAndProcess({
      tenantId: 't1', courseId: 'c1', title: 'src',
      sourceType: 'TEXT', origin: 'manual', rawText: 'הלכות תשובה פרק א.',
    });
    await vi.runAllTimersAsync();

    const setCalls = extractSetCalls(db);
    const statuses = setCalls.map((c) => c['status']).filter(Boolean);

    expect(statuses).toContain('PROCESSING');
    expect(statuses).toContain('READY');
  });

  // ── 4. Embedding failure: text stored, chunk_count = 0, status = READY ─────

  it('when embedding fails for all chunks, status is READY and raw_content is stored', async () => {
    const EXTRACTED = 'שאל אותי כלב — מה ראית. עניתי בשקט.';
    const { svc, db } = await buildService({
      extractedText: EXTRACTED,
      embeddingError: true,
    });

    await svc.createAndProcess({
      tenantId: 't1', courseId: 'c1', title: 'src',
      sourceType: 'TEXT', origin: 'manual', rawText: EXTRACTED,
    });
    await vi.runAllTimersAsync();

    const setCalls = extractSetCalls(db);
    const readyCall = setCalls.find((c) => c['status'] === 'READY');

    expect(readyCall).toBeDefined();
    // Text must be stored even without embeddings (readable by students)
    expect(readyCall!['raw_content']).toBe(EXTRACTED);
    // No successful embeds — semantic search won't work but text is accessible
    expect(readyCall!['chunk_count']).toBe(0);
  });

  // ── 5. Parse failure → FAILED with error_message ───────────────────────────

  it('when DOCX parsing fails, source is marked FAILED with error_message', async () => {
    const { svc, db } = await buildService({ extractedText: '', parseError: true });

    await svc.createAndProcess({
      tenantId: 't1', courseId: 'c1', title: 'broken',
      sourceType: 'FILE_DOCX', origin: 'broken.docx',
      fileBuffer: Buffer.from('not-a-real-docx'),
    });
    await vi.runAllTimersAsync();

    const setCalls = extractSetCalls(db);
    const failedCall = setCalls.find((c) => c['status'] === 'FAILED');

    expect(failedCall).toBeDefined();
    expect(String(failedCall!['error_message'])).toContain('bad DOCX');
    // No text stored on failure
    expect(failedCall!['raw_content'] ?? null).toBeNull();
  });

  // ── 6. chunk_count = number of successful embeds ───────────────────────────

  it('chunk_count reflects the number of chunks that were embedded successfully', async () => {
    const LONG_TEXT = 'א'.repeat(2500);
    const { svc, db, parser } = await buildService({ extractedText: LONG_TEXT });

    parser.chunkText = vi.fn().mockReturnValue([
      { index: 0, text: 'c0' },
      { index: 1, text: 'c1' },
      { index: 2, text: 'c2' },
    ]);

    await svc.createAndProcess({
      tenantId: 't1', courseId: 'c1', title: 'long',
      sourceType: 'TEXT', origin: 'manual', rawText: LONG_TEXT,
    });
    await vi.runAllTimersAsync();

    const setCalls = extractSetCalls(db);
    const readyCall = setCalls.find((c) => c['status'] === 'READY');

    expect(readyCall!['chunk_count']).toBe(3);
  });
});

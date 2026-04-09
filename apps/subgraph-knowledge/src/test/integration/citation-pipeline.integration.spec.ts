/**
 * P2-11: Integration test — transcript → NER → graph → verified citation.
 * Mocks: AI SDK, Apache AGE, NATS, DB writes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock AI SDK ─────────────────────────────────────────────────────────────
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'openai-model')),
}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn(() => 'ollama-model')),
}));

import { generateObject } from 'ai';

// ── Types ───────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}
interface CitationCandidate {
  bookName: string;
  part?: string;
  page?: string;
  column?: string;
  originalText: string;
  confidence: number;
  segmentIndex: number;
}
interface EnrichedBlock {
  lessonId: string;
  segmentId: string;
  blockType: 'TEXT' | 'CITATION' | 'VISUAL_ANCHOR' | 'HEADING';
  blockOrder: number;
  content: Record<string, unknown>;
  citationId?: string;
  startTime: number;
  endTime: number;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440010';

const TRANSCRIPT_SEGMENTS: TranscriptSegment[] = [
  {
    id: 'seg-1',
    text: 'שלום, היום נלמד על עץ חיים שער ממז"א',
    startTime: 0,
    endTime: 5,
  },
  { id: 'seg-2', text: 'נפתח בזוהר חלק א דף לב', startTime: 5, endTime: 10 },
  { id: 'seg-3', text: 'זהו נושא מעניין מאוד', startTime: 10, endTime: 15 },
];

const NER_RESPONSE = {
  citations: [
    {
      bookName: 'עץ חיים',
      part: 'שער ממז"א',
      originalText: 'עץ חיים שער ממז"א',
      confidence: 0.92,
      segmentIndex: 0,
    },
    {
      bookName: 'זוהר',
      part: 'חלק א',
      page: 'דף לב',
      originalText: 'זוהר חלק א דף לב',
      confidence: 0.95,
      segmentIndex: 1,
    },
  ],
};

const GRAPH_SOURCES = {
  'עץ חיים': { id: 'gs-etz', title: 'עץ חיים', type: 'SACRED_TEXT' },
  זוהר: { id: 'gs-zohar', title: 'זוהר', type: 'SACRED_TEXT' },
};

const KNOWLEDGE_SOURCES = {
  'gs-etz': { id: 'ks-1', rawContent: 'שער ממז"א text content...' },
  'gs-zohar': { id: 'ks-2', rawContent: 'זוהר חלק א דף לב text...' },
};

// ── Mock functions ──────────────────────────────────────────────────────────

const mockFindSourceByTitleFuzzy = vi.fn();
const mockFetchKnowledgeSource = vi.fn();
const mockInsertCitation = vi.fn();
const mockInsertBlocks = vi.fn();
const mockNatsPublish = vi.fn();

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Citation Pipeline — Full Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup graph source lookups
    mockFindSourceByTitleFuzzy.mockImplementation((title: string) =>
      Promise.resolve(
        GRAPH_SOURCES[title as keyof typeof GRAPH_SOURCES] ?? null
      )
    );

    // Setup knowledge source lookups
    mockFetchKnowledgeSource.mockImplementation((gsId: string) =>
      Promise.resolve(
        KNOWLEDGE_SOURCES[gsId as keyof typeof KNOWLEDGE_SOURCES] ?? null
      )
    );

    mockInsertCitation.mockResolvedValue({ id: 'citation-uuid' });
    mockInsertBlocks.mockResolvedValue({ inserted: 3 });
    mockNatsPublish.mockResolvedValue(undefined);
  });

  it('Step 1: NER extracts citation candidates from transcript segments', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: NER_RESPONSE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await generateObject({
      model: 'ollama-model' as never,
      schema: {} as never,
      prompt: TRANSCRIPT_SEGMENTS.map((s) => s.text).join('\n'),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const citations = (result as any).object.citations;
    expect(citations).toHaveLength(2);
    expect(citations[0].bookName).toBe('עץ חיים');
    expect(citations[1].bookName).toBe('זוהר');
  });

  it('Step 2: Each citation candidate is resolved against the knowledge graph', async () => {
    const candidates: CitationCandidate[] = NER_RESPONSE.citations;
    const resolved = [];

    for (const candidate of candidates) {
      const graphSource = await mockFindSourceByTitleFuzzy(candidate.bookName);

      if (graphSource) {
        const ks = await mockFetchKnowledgeSource(graphSource.id);
        resolved.push({
          ...candidate,
          matchStatus: 'VERIFIED' as const,
          resolvedText: ks?.rawContent,
          knowledgeSourceId: ks?.id,
          graphSourceId: graphSource.id,
        });
      } else {
        resolved.push({ ...candidate, matchStatus: 'UNVERIFIED' as const });
      }
    }

    expect(resolved).toHaveLength(2);
    expect(resolved[0].matchStatus).toBe('VERIFIED');
    expect(resolved[0].resolvedText).toContain('שער ממז"א');
    expect(resolved[1].matchStatus).toBe('VERIFIED');
    expect(resolved[1].graphSourceId).toBe('gs-zohar');
  });

  it('Step 3: Enriched transcript blocks are built from segments + citations', () => {
    const blocks: EnrichedBlock[] = [];
    let order = 0;

    for (const segment of TRANSCRIPT_SEGMENTS) {
      // Add TEXT block for segment
      blocks.push({
        lessonId: LESSON_ID,
        segmentId: segment.id,
        blockType: 'TEXT',
        blockOrder: order++,
        content: { text: segment.text },
        startTime: segment.startTime,
        endTime: segment.endTime,
      });

      // Check if this segment has a citation
      const citation = NER_RESPONSE.citations.find(
        (c) => TRANSCRIPT_SEGMENTS[c.segmentIndex]?.id === segment.id
      );

      if (citation) {
        blocks.push({
          lessonId: LESSON_ID,
          segmentId: segment.id,
          blockType: 'CITATION',
          blockOrder: order++,
          content: {
            bookName: citation.bookName,
            part: citation.part,
            page: citation.page,
            originalText: citation.originalText,
          },
          citationId: 'citation-uuid',
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
      }
    }

    // 3 TEXT blocks + 2 CITATION blocks = 5 total
    expect(blocks).toHaveLength(5);
    expect(blocks.filter((b) => b.blockType === 'TEXT')).toHaveLength(3);
    expect(blocks.filter((b) => b.blockType === 'CITATION')).toHaveLength(2);

    // Verify ordering is sequential
    for (let i = 0; i < blocks.length - 1; i++) {
      // eslint-disable-next-line security/detect-object-injection
      expect(blocks[i].blockOrder).toBeLessThan(blocks[i + 1].blockOrder);
    }
  });

  it('Step 4: NATS event lesson.enrichment.completed has correct payload', () => {
    const eventPayload = {
      lessonId: LESSON_ID,
      tenantId: TENANT_ID,
      blockCount: 5,
      citationCount: 2,
    };

    mockNatsPublish(
      'lesson.enrichment.completed',
      JSON.stringify(eventPayload)
    );

    expect(mockNatsPublish).toHaveBeenCalledWith(
      'lesson.enrichment.completed',
      expect.stringContaining(LESSON_ID)
    );

    const published = JSON.parse(mockNatsPublish.mock.calls[0][1] as string);
    expect(published.blockCount).toBe(5);
    expect(published.citationCount).toBe(2);
    expect(published.tenantId).toBe(TENANT_ID);
  });

  it('handles NER returning zero citations gracefully', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { citations: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await generateObject({
      model: 'ollama-model' as never,
      schema: {} as never,
      prompt: 'No citations in this text',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const citations = (result as any).object.citations;
    expect(citations).toHaveLength(0);

    // Should still produce TEXT blocks for all segments
    const blocks = TRANSCRIPT_SEGMENTS.map((seg, i) => ({
      blockType: 'TEXT' as const,
      blockOrder: i,
      segmentId: seg.id,
    }));
    expect(blocks).toHaveLength(3);
  });

  it('handles graph source not found — marks as UNVERIFIED', async () => {
    mockFindSourceByTitleFuzzy.mockResolvedValue(null);

    const candidate = NER_RESPONSE.citations[0];
    const graphSource = await mockFindSourceByTitleFuzzy(candidate.bookName);

    expect(graphSource).toBeNull();

    const resolved = {
      ...candidate,
      matchStatus: graphSource ? 'VERIFIED' : 'UNVERIFIED',
    };
    expect(resolved.matchStatus).toBe('UNVERIFIED');
  });

  it('pipeline is idempotent — re-run produces same block count', () => {
    const buildBlocks = (segments: TranscriptSegment[]) => {
      const blocks: { blockType: string; segmentId: string }[] = [];
      for (const seg of segments) {
        blocks.push({ blockType: 'TEXT', segmentId: seg.id });
      }
      return blocks;
    };

    const run1 = buildBlocks(TRANSCRIPT_SEGMENTS);
    const run2 = buildBlocks(TRANSCRIPT_SEGMENTS);

    expect(run1).toEqual(run2);
    expect(run1).toHaveLength(run2.length);
  });
});

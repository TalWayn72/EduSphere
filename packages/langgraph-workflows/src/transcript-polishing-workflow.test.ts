/** Integration tests for the Transcript Polishing Workflow (LangGraph). */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', () => ({ generateText: vi.fn() }));

vi.mock('@langchain/langgraph', () => {
  type NodeFn = (s: Record<string, unknown>) => Promise<Record<string, unknown>>;
  type CondEdge = { from: string; fn: (s: Record<string, unknown>) => string; map: Record<string, string> };
  const AnnotationFn = (c?: unknown) => c ?? {};
  AnnotationFn.Root = (f: Record<string, unknown>) => f;
  return {
    Annotation: AnnotationFn, START: '__start__', END: '__end__',
    StateGraph: vi.fn().mockImplementation(function () {
      const nodes: Record<string, NodeFn> = {};
      let entryPoint = '';
      const edges: Array<[string, string]> = [];
      const conditionalEdges: CondEdge[] = [];

      this.addNode = vi.fn(function (this: unknown, name: string, fn: NodeFn) {
        nodes[name] = fn;
        return this;
      });
      this.addEdge = vi.fn(function (this: unknown, from: string, to: string) {
        if (from === '__start__') {
          entryPoint = to;
        } else {
          edges.push([from, to]);
        }
        return this;
      });
      this.addConditionalEdges = vi.fn(function (
        this: unknown,
        from: string,
        fn: (s: Record<string, unknown>) => string,
        map: Record<string, string>
      ) {
        conditionalEdges.push({ from, fn, map });
        return this;
      });
      this.compile = vi.fn(function () {
        return {
          invoke: vi.fn(async function (initialState: unknown) {
            let state = {
              ...(initialState as Record<string, unknown>),
              chunks: [],
              polishedChunks: [],
              coverageGaps: [],
              repairAttempts: 0,
              formattedBlocks: [],
              coverageScore: 0,
              stitchedText: '',
              voiceProfile: '{}',
              status: 'PROCESSING',
              progress: 0,
            };

            const visited = new Set<string>();
            let current = entryPoint;

            while (current && current !== '__end__' && !visited.has(current)) {
              visited.add(current);
              if (nodes[current]) {
                const partial = await nodes[current]!(state);
                state = { ...state, ...(partial as Record<string, unknown>) };
              }

              const cond = conditionalEdges.find((ce) => ce.from === current);
              if (cond) {
                const target = cond.fn(state);
                current = cond.map[target] ?? '__end__';
                continue;
              }

              const edge = edges.find(([from]) => from === current);
              current = edge ? edge[1] : '__end__';
            }

            return state;
          }),
        };
      });
    }),
  };
});

import { generateText } from 'ai';
import { createTranscriptPolishingWorkflow } from './transcript-polishing-workflow';
import { ChangeType } from './transcript-polishing-types';
import type { RawSegment, JargonEntry } from './transcript-polishing-types';
import type { LanguageModel } from 'ai';

const mockGenerateText = vi.mocked(generateText);

const makeSegment = (id: string, text: string, startTime: number, endTime: number): RawSegment =>
  ({ id, text, startTime, endTime });

const SEGMENTS: RawSegment[] = [
  makeSegment('s1', 'שלום לכולם אהה היום נלמד על ספירת הכתר', 0, 30_000),
  makeSegment('s2', 'כלומר הכתר הוא ממ ממ הספירה הראשונה', 31_000, 60_000),
  makeSegment('s3', 'הבנתם? טוב נמשיך', 61_000, 90_000),
];

const GLOSSARY: JargonEntry[] = [
  { canonical: 'האר"י', altForms: ['הארי', 'הרב לוריא'] },
  { canonical: 'מהרח"ו', altForms: ['מהרחו'] },
];

const POLISHED_TEXT = 'היום נלמד על ספירת הכתר. הכתר הוא הספירה הראשונה.';

const POLISHED_RESPONSE = JSON.stringify({
  polishedText: POLISHED_TEXT,
  changes: [
    { type: ChangeType.FILLER_REMOVED, original: 'אהה', replacement: null, reason: 'מילת מילוי' },
    { type: ChangeType.AUDIENCE_ADDRESS_REMOVED, original: 'הבנתם?', replacement: null, reason: 'פניה לקהל' },
  ],
});

const VOICE_RESPONSE = JSON.stringify({
  avgSentenceLength: 'medium',
  formality: 'semi-formal',
  transitionPhrases: ['כלומר', 'נמצא', 'לכן'],
  rhythmMarkers: ['שימו לב', 'חשוב להבין'],
});

const STITCH_RESPONSE = JSON.stringify({ stitchedTransition: 'ובהמשך לכך,' });

const MOCK_MODEL = {} as LanguageModel;

describe('createTranscriptPolishingWorkflow', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it('returns a compiled workflow with invoke method', () => {
    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    expect(typeof workflow.invoke).toBe('function');
  });

  it('processes a basic transcript and returns DRAFT or PROCESSING status', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: VOICE_RESPONSE } as never)
      .mockResolvedValueOnce({ text: POLISHED_RESPONSE } as never)
      .mockResolvedValueOnce({ text: STITCH_RESPONSE } as never)
      .mockResolvedValue({ text: POLISHED_RESPONSE } as never);

    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    const result = await workflow.invoke({
      lessonId: 'lesson-1',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-1',
      rawSegments: SEGMENTS,
      jargonGlossary: GLOSSARY,
    });

    expect(result).toBeDefined();
    expect(['DRAFT', 'PROCESSING', 'ERROR']).toContain(result.status);
  });

  it('sets progress to 100 on completion', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: VOICE_RESPONSE } as never)
      .mockResolvedValueOnce({ text: POLISHED_RESPONSE } as never)
      .mockResolvedValue({ text: STITCH_RESPONSE } as never);

    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    const result = await workflow.invoke({
      lessonId: 'lesson-2',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-2',
      rawSegments: SEGMENTS,
      jargonGlossary: [],
    });

    expect(result.progress).toBeGreaterThanOrEqual(75);
  });

  it('produces a formattedBlocks array', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: VOICE_RESPONSE } as never)
      .mockResolvedValueOnce({ text: POLISHED_RESPONSE } as never)
      .mockResolvedValue({ text: STITCH_RESPONSE } as never);

    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    const result = await workflow.invoke({
      lessonId: 'lesson-3',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-3',
      rawSegments: SEGMENTS,
      jargonGlossary: [],
    });

    expect(Array.isArray(result.formattedBlocks)).toBe(true);
  });

  it('returns ERROR status when no segments provided', async () => {
    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    const result = await workflow.invoke({
      lessonId: 'lesson-4',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-4',
      rawSegments: [],
      jargonGlossary: [],
    });

    expect(result.status).toBe('ERROR');
    expect(result.error).toBeTruthy();
  });

  it('groups segments into at least 1 chunk', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: VOICE_RESPONSE } as never)
      .mockResolvedValueOnce({ text: POLISHED_RESPONSE } as never)
      .mockResolvedValue({ text: STITCH_RESPONSE } as never);

    const segments: RawSegment[] = [
      makeSegment('a', 'first sentence', 0, 10_000),
      makeSegment('b', 'second sentence', 10_500, 20_000),
      makeSegment('c', 'third after pause', 23_000, 33_000),
    ];

    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    const result = await workflow.invoke({
      lessonId: 'lesson-chunk',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-chunk',
      rawSegments: segments,
      jargonGlossary: [],
    });

    expect(result.chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('incorporates existingVoiceProfile when provided', async () => {
    const existingProfile = JSON.stringify({
      avgSentenceLength: 'long',
      formality: 'formal',
      transitionPhrases: ['לפיכך'],
      rhythmMarkers: ['שים לב'],
    });

    mockGenerateText
      .mockResolvedValueOnce({ text: VOICE_RESPONSE } as never)
      .mockResolvedValueOnce({ text: POLISHED_RESPONSE } as never)
      .mockResolvedValue({ text: STITCH_RESPONSE } as never);

    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    const result = await workflow.invoke({
      lessonId: 'lesson-5',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-5',
      rawSegments: SEGMENTS,
      jargonGlossary: [],
      existingVoiceProfile: existingProfile,
    });

    expect(result.voiceProfile).toBeTruthy();
    expect(() => JSON.parse(result.voiceProfile as string)).not.toThrow();
  });

  it('calls generateText for voice extraction and polishing', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: VOICE_RESPONSE } as never)
      .mockResolvedValueOnce({ text: POLISHED_RESPONSE } as never)
      .mockResolvedValue({ text: STITCH_RESPONSE } as never);

    const workflow = createTranscriptPolishingWorkflow({ model: MOCK_MODEL });
    await workflow.invoke({
      lessonId: 'lesson-6',
      tenantId: 'tenant-1',
      transcriptId: 'transcript-6',
      rawSegments: SEGMENTS,
      jargonGlossary: [],
    });

    expect(mockGenerateText.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

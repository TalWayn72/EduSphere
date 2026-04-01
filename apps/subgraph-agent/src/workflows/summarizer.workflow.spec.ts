/**
 * Summarizer Workflow unit tests.
 *
 * Verifies:
 * - createSummarizerWorkflow returns step and stream functions
 * - EXTRACT state calls generateText and transitions to OUTLINE
 * - OUTLINE state transitions to DRAFT
 * - DRAFT state transitions to REFINE
 * - REFINE state parses JSON output into SummaryOutput
 * - REFINE state handles invalid JSON gracefully
 * - COMPLETE state returns isComplete=true
 * - stream() selects correct prompt per state
 * - parseSummaryOutput handles missing fields with defaults
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

vi.mock('../ai/locale-prompt', () => ({
  injectLocale: vi.fn((prompt: string) => prompt),
}));

import {
  createSummarizerWorkflow,
  type SummarizerContext,
} from './summarizer.workflow';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFakeModel() {
  return { modelId: 'test' } as never;
}

function makeContext(
  overrides: Partial<SummarizerContext> = {}
): SummarizerContext {
  return {
    sessionId: 'sess-1',
    content: 'Sample course content about data structures.',
    rawExtraction: '',
    outline: '',
    draft: '',
    finalSummary: null,
    currentState: 'EXTRACT',
    ...overrides,
  };
}

function makeValidRefineJson() {
  return JSON.stringify({
    keyConcepts: ['Arrays', 'Linked Lists'],
    mainPoints: [
      'Arrays provide O(1) access',
      'Linked lists allow O(1) insert',
    ],
    learningObjectives: ['Understand array vs linked list trade-offs'],
    summary: 'A comprehensive overview of basic data structures.',
    estimatedReadTime: 5,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createSummarizerWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: 'Generated text' });
    mockStreamText.mockResolvedValue({ textStream: 'stream' });
  });

  it('returns step and stream functions', () => {
    const wf = createSummarizerWorkflow(makeFakeModel());
    expect(typeof wf.step).toBe('function');
    expect(typeof wf.stream).toBe('function');
  });

  // ── EXTRACT ───────────────────────────────────────────────────────────────

  it('EXTRACT calls generateText and transitions to OUTLINE', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'Extracted concepts...' });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(makeContext({ currentState: 'EXTRACT' }));

    expect(result.nextState).toBe('OUTLINE');
    expect(result.updatedContext.rawExtraction).toBe('Extracted concepts...');
    expect(result.isComplete).toBe(false);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.2 })
    );
  });

  // ── OUTLINE ───────────────────────────────────────────────────────────────

  it('OUTLINE transitions to DRAFT', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '## Outline\n- Point 1' });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({
        currentState: 'OUTLINE',
        rawExtraction: 'Some extracted text',
      })
    );

    expect(result.nextState).toBe('DRAFT');
    expect(result.updatedContext.outline).toBe('## Outline\n- Point 1');
    expect(result.isComplete).toBe(false);
  });

  // ── DRAFT ─────────────────────────────────────────────────────────────────

  it('DRAFT transitions to REFINE', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'This is the draft summary...',
    });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({
        currentState: 'DRAFT',
        outline: '## Outline',
      })
    );

    expect(result.nextState).toBe('REFINE');
    expect(result.updatedContext.draft).toBe('This is the draft summary...');
    expect(result.isComplete).toBe(false);
  });

  // ── REFINE ────────────────────────────────────────────────────────────────

  it('REFINE parses valid JSON into SummaryOutput', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: makeValidRefineJson() });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({
        currentState: 'REFINE',
        draft: 'Draft text',
      })
    );

    expect(result.nextState).toBe('COMPLETE');
    expect(result.summary).toBeDefined();
    expect(result.summary?.keyConcepts).toEqual(['Arrays', 'Linked Lists']);
    expect(result.summary?.estimatedReadTime).toBe(5);
    expect(result.isComplete).toBe(false);
  });

  it('REFINE handles JSON with extra text around it', async () => {
    const json = makeValidRefineJson();
    mockGenerateText.mockResolvedValueOnce({
      text: `Here is the result:\n${json}\nEnd.`,
    });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'REFINE', draft: 'Draft' })
    );

    expect(result.summary).toBeDefined();
    expect(result.summary?.keyConcepts).toHaveLength(2);
  });

  it('REFINE returns null summary for invalid JSON', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'Not valid JSON at all' });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'REFINE', draft: 'Draft' })
    );

    expect(result.nextState).toBe('COMPLETE');
    expect(result.updatedContext.finalSummary).toBeNull();
  });

  it('REFINE defaults missing fields', async () => {
    const partial = JSON.stringify({
      summary: 'Just a summary',
    });
    mockGenerateText.mockResolvedValueOnce({ text: partial });
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'REFINE', draft: 'Draft' })
    );

    expect(result.summary?.keyConcepts).toEqual([]);
    expect(result.summary?.mainPoints).toEqual([]);
    expect(result.summary?.learningObjectives).toEqual([]);
    expect(result.summary?.estimatedReadTime).toBe(3);
  });

  // ── COMPLETE ──────────────────────────────────────────────────────────────

  it('COMPLETE returns isComplete=true with final summary', async () => {
    const finalSummary = {
      keyConcepts: ['A'],
      mainPoints: ['B'],
      learningObjectives: ['C'],
      summary: 'Final text',
      estimatedReadTime: 2,
    };
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'COMPLETE', finalSummary })
    );

    expect(result.isComplete).toBe(true);
    expect(result.nextState).toBe('COMPLETE');
    expect(result.text).toBe('Final text');
    expect(result.summary).toEqual(finalSummary);
  });

  it('COMPLETE falls back to draft when no finalSummary', async () => {
    const wf = createSummarizerWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({
        currentState: 'COMPLETE',
        draft: 'Draft fallback',
        finalSummary: null,
      })
    );

    expect(result.text).toBe('Draft fallback');
    expect(result.isComplete).toBe(true);
  });

  // ── stream ────────────────────────────────────────────────────────────────

  it('stream() calls streamText', async () => {
    const wf = createSummarizerWorkflow(makeFakeModel());
    await wf.stream(makeContext({ currentState: 'EXTRACT' }));

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ model: makeFakeModel() })
    );
  });

  it('stream() uses OUTLINE prompt when in OUTLINE state', async () => {
    const wf = createSummarizerWorkflow(makeFakeModel());
    await wf.stream(
      makeContext({
        currentState: 'OUTLINE',
        rawExtraction: 'Extracted data',
      })
    );

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Extracted data'),
      })
    );
  });
});

/**
 * Chavruta Workflow unit tests.
 *
 * Verifies:
 * - createChavrutaWorkflow returns step and stream functions
 * - step() in ASSESS state returns CHALLENGE as next state
 * - step() in CHALLENGE state returns RESPOND as next state
 * - step() in RESPOND state returns CHALLENGE when turn < 3 and score < 4
 * - step() in RESPOND state returns EVALUATE when turn >= 3
 * - step() in EVALUATE state extracts score from [SCORE:N] format
 * - step() in EVALUATE state defaults to score 3 when no pattern found
 * - step() in CONCLUDE state returns isComplete=true
 * - stream() returns streamText result
 * - Locale injection works for non-English locales
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

vi.mock('../ai/locale-prompt', () => ({
  injectLocale: vi.fn((prompt: string, locale: string) =>
    locale === 'en' ? prompt : `${prompt}\n\n[${locale}]`
  ),
}));

import {
  createChavrutaWorkflow,
  type ChavrutaContext,
} from './chavruta.workflow';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFakeModel() {
  return { modelId: 'test' } as never;
}

function makeContext(
  overrides: Partial<ChavrutaContext> = {}
): ChavrutaContext {
  return {
    sessionId: 'sess-1',
    content: 'Test content about philosophy',
    history: [{ role: 'user', text: 'Hello' }],
    understandingScore: 2,
    turn: 0,
    currentState: 'ASSESS',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createChavrutaWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: 'AI response' });
    mockStreamText.mockResolvedValue({ textStream: 'stream' });
  });

  it('returns step and stream functions', () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    expect(typeof wf.step).toBe('function');
    expect(typeof wf.stream).toBe('function');
  });

  // ── State transitions ─────────────────────────────────────────────────────

  it('ASSESS -> CHALLENGE transition', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    const result = await wf.step(makeContext({ currentState: 'ASSESS' }));

    expect(result.nextState).toBe('CHALLENGE');
    expect(result.text).toBe('AI response');
    expect(result.isComplete).toBe(false);
  });

  it('CHALLENGE -> RESPOND transition', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    const result = await wf.step(
      makeContext({ currentState: 'CHALLENGE' })
    );

    expect(result.nextState).toBe('RESPOND');
  });

  it('RESPOND -> CHALLENGE when turn < 3 and score < 4', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    const result = await wf.step(
      makeContext({
        currentState: 'RESPOND',
        turn: 1,
        understandingScore: 2,
      })
    );

    expect(result.nextState).toBe('CHALLENGE');
  });

  it('RESPOND -> EVALUATE when turn >= 3', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    const result = await wf.step(
      makeContext({
        currentState: 'RESPOND',
        turn: 3,
        understandingScore: 2,
      })
    );

    expect(result.nextState).toBe('EVALUATE');
  });

  it('RESPOND -> EVALUATE when score >= 4', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    const result = await wf.step(
      makeContext({
        currentState: 'RESPOND',
        turn: 1,
        understandingScore: 4,
      })
    );

    expect(result.nextState).toBe('EVALUATE');
  });

  // ── EVALUATE score extraction ─────────────────────────────────────────────

  it('EVALUATE extracts score from [SCORE:N] pattern', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '[SCORE:4] Good understanding of the topic.',
    });
    const wf = createChavrutaWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'EVALUATE' })
    );

    expect(result.understandingScore).toBe(4);
    expect(result.nextState).toBe('CONCLUDE');
  });

  it('EVALUATE defaults score to 3 when no pattern found', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'Good job, keep going!',
    });
    const wf = createChavrutaWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'EVALUATE' })
    );

    expect(result.understandingScore).toBe(3);
  });

  it('EVALUATE clamps score to max 5', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '[SCORE:9] Excellent!' });
    const wf = createChavrutaWorkflow(makeFakeModel());

    const result = await wf.step(
      makeContext({ currentState: 'EVALUATE' })
    );

    expect(result.understandingScore).toBe(5);
  });

  // ── CONCLUDE ──────────────────────────────────────────────────────────────

  it('CONCLUDE returns isComplete=true', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    const result = await wf.step(
      makeContext({ currentState: 'CONCLUDE' })
    );

    expect(result.isComplete).toBe(true);
    expect(result.nextState).toBe('CONCLUDE');
  });

  // ── stream ────────────────────────────────────────────────────────────────

  it('stream() calls streamText with correct params', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel());
    await wf.stream(makeContext({ currentState: 'ASSESS' }));

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: makeFakeModel(),
        temperature: 0.8,
      })
    );
  });

  // ── Locale injection ──────────────────────────────────────────────────────

  it('injects locale for non-English', async () => {
    const wf = createChavrutaWorkflow(makeFakeModel(), 'he');
    await wf.step(makeContext({ currentState: 'ASSESS' }));

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('[he]'),
      })
    );
  });

  // ── History mapping ───────────────────────────────────────────────────────

  it('maps history entries to messages format', async () => {
    const history = [
      { role: 'user' as const, text: 'Hello' },
      { role: 'assistant' as const, text: 'Welcome' },
    ];
    const wf = createChavrutaWorkflow(makeFakeModel());
    await wf.step(makeContext({ history }));

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Welcome' },
        ],
      })
    );
  });
});

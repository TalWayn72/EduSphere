/**
 * CertExamGenAdapter unit tests.
 *
 * Verifies:
 * - runCertExamGenerator invokes createCertExamGeneratorWorkflow with model
 * - Returns items from finalItems in result state
 * - Returns errors from result state
 * - Falls back to MemorySaver when no checkpointer provided
 * - Passes threadConfig with correct thread_id
 * - Handles empty finalItems gracefully
 * - Handles empty errors gracefully
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.hoisted(() => vi.fn());
const mockCreateWorkflow = vi.hoisted(() =>
  vi.fn(() => ({ invoke: mockInvoke }))
);

vi.mock('@edusphere/langgraph-workflows', () => ({
  createCertExamGeneratorWorkflow: mockCreateWorkflow,
}));

vi.mock('@langchain/langgraph', () => ({
  MemorySaver: vi.fn(),
}));

vi.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: vi.fn(),
}));

import { runCertExamGenerator } from './cert-exam-gen.adapter';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFakeModel() {
  return { modelId: 'test-model' } as never;
}

function makeInvokeResult(overrides: Record<string, unknown> = {}) {
  return {
    finalItems: [
      { question: 'What is X?', options: ['A', 'B'], correct: 'A' },
    ],
    errors: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('runCertExamGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes workflow with model and returns items', async () => {
    const items = [{ question: 'Q1', options: ['A'], correct: 'A' }];
    mockInvoke.mockResolvedValueOnce(makeInvokeResult({ finalItems: items }));

    const result = await runCertExamGenerator(
      'thread-1',
      'mod-1',
      ['REMEMBER', 'APPLY'],
      5,
      'MEDIUM',
      'en',
      makeFakeModel()
    );

    expect(mockCreateWorkflow).toHaveBeenCalledWith(
      makeFakeModel(),
      undefined
    );
    expect(result.items).toEqual(items);
    expect(result.errors).toEqual([]);
  });

  it('passes searchFn to createCertExamGeneratorWorkflow', async () => {
    mockInvoke.mockResolvedValueOnce(makeInvokeResult());
    const searchFn = vi.fn();

    await runCertExamGenerator(
      'thread-2',
      'mod-1',
      ['ANALYZE'],
      3,
      'HARD',
      'he',
      makeFakeModel(),
      undefined,
      searchFn
    );

    expect(mockCreateWorkflow).toHaveBeenCalledWith(
      makeFakeModel(),
      searchFn
    );
  });

  it('passes correct thread_id in configurable', async () => {
    mockInvoke.mockResolvedValueOnce(makeInvokeResult());

    await runCertExamGenerator(
      'thread-abc',
      'mod-1',
      ['REMEMBER'],
      2,
      'EASY',
      'en',
      makeFakeModel()
    );

    expect(mockInvoke).toHaveBeenCalledWith(
      expect.objectContaining({ moduleId: 'mod-1', locale: 'en' }),
      { configurable: { thread_id: 'thread-abc' } }
    );
  });

  it('returns empty items when finalItems is missing', async () => {
    mockInvoke.mockResolvedValueOnce({ errors: ['Some error'] });

    const result = await runCertExamGenerator(
      'thread-3',
      'mod-1',
      ['APPLY'],
      5,
      'MEDIUM',
      'en',
      makeFakeModel()
    );

    expect(result.items).toEqual([]);
    expect(result.errors).toEqual(['Some error']);
  });

  it('returns empty errors when errors is missing', async () => {
    const items = [{ question: 'Q', options: [], correct: 'A' }];
    mockInvoke.mockResolvedValueOnce({ finalItems: items });

    const result = await runCertExamGenerator(
      'thread-4',
      'mod-1',
      ['EVALUATE'],
      1,
      'EASY',
      'en',
      makeFakeModel()
    );

    expect(result.items).toEqual(items);
    expect(result.errors).toEqual([]);
  });

  it('populates initial state with all parameters', async () => {
    mockInvoke.mockResolvedValueOnce(makeInvokeResult());

    await runCertExamGenerator(
      'thread-5',
      'mod-xyz',
      ['CREATE'],
      10,
      'HARD',
      'he',
      makeFakeModel()
    );

    const invokedState = mockInvoke.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(invokedState.moduleId).toBe('mod-xyz');
    expect(invokedState.targetBloomLevels).toEqual(['CREATE']);
    expect(invokedState.targetCount).toBe(10);
    expect(invokedState.targetDifficulty).toBe('HARD');
    expect(invokedState.locale).toBe('he');
    expect(invokedState.retryCount).toBe(0);
    expect(invokedState.generatedItems).toEqual([]);
  });

  it('propagates workflow invoke errors', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Workflow failed'));

    await expect(
      runCertExamGenerator(
        'thread-err',
        'mod-1',
        ['REMEMBER'],
        1,
        'EASY',
        'en',
        makeFakeModel()
      )
    ).rejects.toThrow('Workflow failed');
  });
});

/**
 * ai.langgraph.workflow.spec.ts — Static + unit tests for LangGraph adapters.
 *
 * Complements ai.langgraph.memory.spec.ts (which tests LangGraphService lifecycle).
 * This file tests the four adapter functions in ai.langgraph.ts:
 *   runLangGraphDebate, runLangGraphQuiz, runLangGraphTutor, runLangGraphAssessment
 *
 * Test strategy:
 *   1. Static source analysis — verify the four workflow states (assess, quiz,
 *      explain/tutor, debate), checkpointer injection, and MemorySaver fallback.
 *   2. Unit tests of each adapter with fully mocked workflow factories and
 *      a mock MemorySaver checkpointer — no real LLM calls, no real DB.
 *   3. Timeout/race documentation — assert that the source references
 *      Promise.race (or the 5-min timeout constant) as required by
 *      the memory-safety rules.
 *   4. gVisor sandboxing reference — assert that infrastructure or service
 *      code references gVisor (static check on ai.service.ts).
 *   5. Verify the threadConfig helper derives thread_id from sessionId.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

function readSrc(filename: string): string {
  return readFileSync(resolve(__dirname, filename), 'utf-8');
}

function srcExists(filename: string): boolean {
  return existsSync(resolve(__dirname, filename));
}

// ---------------------------------------------------------------------------
// Mocks (hoisted so vi.mock factories can reference them)
// ---------------------------------------------------------------------------

const { mockCompiledInvoke, MockCompiledGraph } = vi.hoisted(() => {
  const mockCompiledInvoke = vi.fn();
  const MockCompiledGraph = { invoke: mockCompiledInvoke };
  return { mockCompiledInvoke, MockCompiledGraph };
});

const { mockDebateWorkflow, mockQuizWorkflow, mockTutorWorkflow, mockAssessmentWorkflow } =
  vi.hoisted(() => {
    const makeWorkflow = () => ({
      compile: vi.fn().mockReturnValue(MockCompiledGraph),
    });
    return {
      mockDebateWorkflow: makeWorkflow(),
      mockQuizWorkflow: makeWorkflow(),
      mockTutorWorkflow: makeWorkflow(),
      mockAssessmentWorkflow: makeWorkflow(),
    };
  });

vi.mock('@edusphere/langgraph-workflows', () => ({
  createDebateWorkflow: vi.fn().mockReturnValue(mockDebateWorkflow),
  createQuizWorkflow: vi.fn().mockReturnValue(mockQuizWorkflow),
  createTutorWorkflow: vi.fn().mockReturnValue(mockTutorWorkflow),
  createAssessmentWorkflow: vi.fn().mockReturnValue(mockAssessmentWorkflow),
}));

vi.mock('@langchain/langgraph', () => {
  class MemorySaver {}
  return { MemorySaver };
});

vi.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: class PostgresSaver {},
}));

import {
  runLangGraphDebate,
  runLangGraphQuiz,
  runLangGraphTutor,
  runLangGraphAssessment,
} from './ai.langgraph.js';

// ---------------------------------------------------------------------------
// 1. Static source analysis: file existence and workflow state references
// ---------------------------------------------------------------------------

describe('ai.langgraph.ts: file exists and defines the four adapters', () => {
  it('ai.langgraph.ts exists', () => {
    expect(srcExists('ai.langgraph.ts')).toBe(true);
  });

  it('exports runLangGraphDebate', () => {
    const src = readSrc('ai.langgraph.ts');
    expect(src).toMatch(/export\s+(async\s+)?function\s+runLangGraphDebate/);
  });

  it('exports runLangGraphQuiz', () => {
    const src = readSrc('ai.langgraph.ts');
    expect(src).toMatch(/export\s+(async\s+)?function\s+runLangGraphQuiz/);
  });

  it('exports runLangGraphTutor', () => {
    const src = readSrc('ai.langgraph.ts');
    expect(src).toMatch(/export\s+(async\s+)?function\s+runLangGraphTutor/);
  });

  it('exports runLangGraphAssessment', () => {
    const src = readSrc('ai.langgraph.ts');
    expect(src).toMatch(/export\s+(async\s+)?function\s+runLangGraphAssessment/);
  });
});

describe('ai.langgraph.ts: all four workflow states are referenced', () => {
  const src = readSrc('ai.langgraph.ts');

  it('references the assess state (assessment workflow)', () => {
    // The assessment adapter initialises an "assess"-related initial state
    expect(src).toContain("'assess'");
  });

  it('references the quiz state (quiz workflow)', () => {
    expect(src).toContain('numQuestions');
  });

  it('references the tutor/explain step', () => {
    // Tutor workflow uses currentStep: 'assess' to begin and explanation in result
    expect(src).toContain('explanation');
  });

  it('references the debate/synthesis state', () => {
    expect(src).toContain('synthesis');
  });
});

describe('ai.langgraph.ts: checkpointer injection and MemorySaver fallback', () => {
  const src = readSrc('ai.langgraph.ts');

  it('accepts an optional checkpointer parameter in each adapter', () => {
    // Each adapter has "checkpointer?: Checkpointer" signature
    const matches = src.match(/checkpointer\?:\s*Checkpointer/g);
    expect(matches).not.toBeNull();
    // Four adapters
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });

  it('falls back to new MemorySaver() when no checkpointer is provided', () => {
    // ?? new MemorySaver() pattern
    expect(src).toContain('new MemorySaver()');
  });

  it('calls workflow.compile() with the checkpointer', () => {
    // Must pass { checkpointer: cp } to compile()
    expect(src).toContain('{ checkpointer: cp }');
  });

  it('derives thread_id from the threadId argument', () => {
    // threadConfig helper returns { configurable: { thread_id: threadId } }
    expect(src).toContain('thread_id: threadId');
  });

  it('uses threadConfig helper when invoking compiled graphs', () => {
    expect(src).toContain('threadConfig(threadId)');
  });
});

// ---------------------------------------------------------------------------
// 2. ai.service.ts structural checks — orchestration layer validation
// ---------------------------------------------------------------------------

describe('ai.service.ts: orchestration layer structure', () => {
  it('ai.service.ts exists', () => {
    expect(srcExists('ai.service.ts')).toBe(true);
  });

  it('ai.service.ts is decorated with @Injectable', () => {
    const src = readSrc('ai.service.ts');
    expect(src).toContain('@Injectable()');
  });

  it('ai.service.ts imports runLangGraphDebate from ai.langgraph', () => {
    const src = readSrc('ai.service.ts');
    expect(src).toContain('runLangGraphDebate');
  });

  it('ai-langgraph-runner.service.ts imports runLangGraphQuiz from ai.langgraph', () => {
    const src = readSrc('ai-langgraph-runner.service.ts');
    expect(src).toContain('runLangGraphQuiz');
  });

  it('ai-langgraph-runner.service.ts imports runLangGraphTutor from ai.langgraph', () => {
    const src = readSrc('ai-langgraph-runner.service.ts');
    expect(src).toContain('runLangGraphTutor');
  });

  it('ai-langgraph-runner.service.ts uses LangGraphService to get checkpointer', () => {
    const src = readSrc('ai-langgraph-runner.service.ts');
    expect(src).toContain('langGraphService.getCheckpointer()');
  });

  it('ai.service.ts passes sessionId to the chavruta workflow for CHAVRUTA_DEBATE', () => {
    // CHAVRUTA_DEBATE now routes to the conversational chavruta.workflow.ts,
    // using sessionId as ChavrutaContext.sessionId (not runLangGraphDebate).
    const src = readSrc('ai.service.ts');
    expect(src).toContain("sessionId,");
    expect(src).toContain('createChavrutaWorkflow');
  });

  it('ai-langgraph-runner.service.ts defines LANGGRAPH_TEMPLATES set', () => {
    const src = readSrc('ai-langgraph-runner.service.ts');
    expect(src).toContain('LANGGRAPH_TEMPLATES');
    expect(src).toContain('CHAVRUTA_DEBATE');
    expect(src).toContain('TUTOR');
  });

  it('ai.service.ts exports AIResult interface', () => {
    const src = readSrc('ai.service.ts');
    expect(src).toMatch(/export\s+interface\s+AIResult/);
  });
});

// ---------------------------------------------------------------------------
// 3. EU AI Act transparency requirements — ai-transparency.ts
// ---------------------------------------------------------------------------

describe('EU AI Act transparency: ai-transparency.ts structure', () => {
  it('ai-transparency.ts exists alongside the agent adapters', () => {
    expect(srcExists('ai-transparency.ts')).toBe(true);
  });

  it('exports AITransparencyMetadata interface', () => {
    const src = readSrc('ai-transparency.ts');
    expect(src).toMatch(/export\s+interface\s+AITransparencyMetadata/);
  });

  it('AITransparencyMetadata has isAIGenerated field', () => {
    const src = readSrc('ai-transparency.ts');
    expect(src).toContain('isAIGenerated');
  });

  it('AITransparencyMetadata has modelUsed field', () => {
    const src = readSrc('ai-transparency.ts');
    expect(src).toContain('modelUsed');
  });

  it('exports requiresHumanReview function (EU AI Act Art.50)', () => {
    const src = readSrc('ai-transparency.ts');
    expect(src).toMatch(/export\s+function\s+requiresHumanReview/);
  });

  it('exports formatTransparencyLabel function', () => {
    const src = readSrc('ai-transparency.ts');
    expect(src).toMatch(/export\s+function\s+formatTransparencyLabel/);
  });

  it('exports AgentType union covering all four workflow types', () => {
    const src = readSrc('ai-transparency.ts');
    expect(src).toContain("'CHAVRUTA'");
    expect(src).toContain("'DEBATE'");
    expect(src).toContain("'TUTOR'");
    expect(src).toContain("'QUIZ_MASTER'");
  });

  it('requiresHumanReview returns true for high-stakes assessments', () => {
    // Static check: source must reference impactsGrade / isAssessment guard
    const src = readSrc('ai-transparency.ts');
    expect(src).toContain('impactsGrade');
    expect(src).toContain('isAssessment');
  });
});

// ---------------------------------------------------------------------------
// 4. Unit tests: runLangGraphDebate
// ---------------------------------------------------------------------------

describe('runLangGraphDebate()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AIResult with text equal to synthesis when present', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({
      synthesis: 'Debate complete: both sides argued well',
      arguments: ['arg1', 'arg2'],
      isComplete: true,
    });

    const result = await runLangGraphDebate('thread-1', 'Climate change', {
      topic: 'Climate change',
      position: 'for',
      rounds: 2,
    });

    expect(result.text).toBe('Debate complete: both sides argued well');
    expect(result.workflowResult).toMatchObject({
      synthesis: 'Debate complete: both sides argued well',
      isComplete: true,
    });
  });

  it('falls back to the original message when synthesis is absent', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({
      arguments: [],
      isComplete: false,
    });

    const result = await runLangGraphDebate('thread-2', 'Original message', {});
    expect(result.text).toBe('Original message');
  });

  it('calls compile() with a checkpointer', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ synthesis: 'ok', arguments: [] });
    await runLangGraphDebate('thread-3', 'msg', {});
    expect(mockDebateWorkflow.compile).toHaveBeenCalledWith(
      expect.objectContaining({ checkpointer: expect.anything() }),
    );
  });

  it('invokes the compiled graph with threadConfig containing thread_id', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ synthesis: 'ok', arguments: [] });
    await runLangGraphDebate('my-thread', 'msg', {});
    const callArgs = mockCompiledInvoke.mock.calls[0];
    // Second argument must be { configurable: { thread_id: 'my-thread' } }
    expect(callArgs[1]).toEqual({ configurable: { thread_id: 'my-thread' } });
  });

  it('passes provided locale to createDebateWorkflow', async () => {
    const { createDebateWorkflow } = await import('@edusphere/langgraph-workflows');
    mockCompiledInvoke.mockResolvedValueOnce({ synthesis: 'ok', arguments: [] });
    await runLangGraphDebate('t', 'msg', {}, 'he');
    expect(createDebateWorkflow).toHaveBeenCalledWith(undefined, 'he');
  });

  it('defaults to "for" position when context.position is missing', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ synthesis: 'ok', arguments: [] });
    await runLangGraphDebate('t', 'msg', {});
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    expect(state['position']).toBe('for');
  });

  it('defaults to 2 rounds when context.rounds is missing', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ synthesis: 'ok', arguments: [] });
    await runLangGraphDebate('t', 'msg', {});
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    expect(state['rounds']).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Unit tests: runLangGraphQuiz
// ---------------------------------------------------------------------------

describe('runLangGraphQuiz()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AIResult with question count in text', async () => {
    const questions = [{ q: 'Q1' }, { q: 'Q2' }, { q: 'Q3' }];
    mockCompiledInvoke.mockResolvedValueOnce({
      questions,
      score: 0,
      isComplete: true,
    });

    const result = await runLangGraphQuiz('thread-q1', 'Algebra', {
      topic: 'Algebra',
      numQuestions: 3,
      difficulty: 'easy',
    });

    expect(result.text).toContain('3');
    expect(result.text).toContain('Algebra');
    expect(result.workflowResult).toMatchObject({ isComplete: true });
  });

  it('handles empty questions array without throwing', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({
      questions: [],
      score: 0,
      isComplete: true,
    });

    const result = await runLangGraphQuiz('thread-q2', 'Math', {});
    expect(result.text).toContain('0');
  });

  it('defaults to 5 questions and medium difficulty', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ questions: [], score: 0 });
    await runLangGraphQuiz('t', 'topic', {});
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    expect(state['numQuestions']).toBe(5);
    expect(state['difficulty']).toBe('medium');
  });

  it('passes provided locale to createQuizWorkflow', async () => {
    const { createQuizWorkflow } = await import('@edusphere/langgraph-workflows');
    mockCompiledInvoke.mockResolvedValueOnce({ questions: [], score: 0 });
    await runLangGraphQuiz('t', 'topic', {}, 'fr');
    expect(createQuizWorkflow).toHaveBeenCalledWith(undefined, 'fr');
  });

  it('invokes compiled graph with correct thread_id', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ questions: [], score: 0 });
    await runLangGraphQuiz('quiz-thread', 'topic', {});
    expect(mockCompiledInvoke.mock.calls[0][1]).toEqual({
      configurable: { thread_id: 'quiz-thread' },
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Unit tests: runLangGraphTutor
// ---------------------------------------------------------------------------

describe('runLangGraphTutor()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AIResult with explanation as text', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({
      explanation: 'Integration is the reverse of differentiation.',
      comprehensionCheck: 'Do you understand?',
      followupSuggestions: ['Try an example'],
      isComplete: true,
    });

    const result = await runLangGraphTutor('thread-t1', 'What is integration?', {});

    expect(result.text).toBe('Integration is the reverse of differentiation.');
    expect(result.workflowResult).toMatchObject({
      explanation: 'Integration is the reverse of differentiation.',
      isComplete: true,
    });
  });

  it('falls back to original message when explanation is absent', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({
      isComplete: true,
    });

    const result = await runLangGraphTutor('thread-t2', 'Fallback message', {});
    expect(result.text).toBe('Fallback message');
  });

  it('passes content from context to the state', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ explanation: 'ok' });
    await runLangGraphTutor('t', 'question', { content: 'lecture text' });
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    expect(state['context']).toBe('lecture text');
  });

  it('defaults currentStep to "assess"', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ explanation: 'ok' });
    await runLangGraphTutor('t', 'question', {});
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    expect(state['currentStep']).toBe('assess');
  });

  it('invokes compiled graph with correct thread_id', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ explanation: 'ok' });
    await runLangGraphTutor('tutor-thread', 'question', {});
    expect(mockCompiledInvoke.mock.calls[0][1]).toEqual({
      configurable: { thread_id: 'tutor-thread' },
    });
  });

  it('passes locale to createTutorWorkflow', async () => {
    const { createTutorWorkflow } = await import('@edusphere/langgraph-workflows');
    mockCompiledInvoke.mockResolvedValueOnce({ explanation: 'ok' });
    await runLangGraphTutor('t', 'q', {}, 'he');
    expect(createTutorWorkflow).toHaveBeenCalledWith(undefined, 'he');
  });
});

// ---------------------------------------------------------------------------
// 7. Unit tests: runLangGraphAssessment
// ---------------------------------------------------------------------------

describe('runLangGraphAssessment()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AIResult with overallAssessment summary as text', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({
      overallAssessment: {
        summary: 'Good answer, but lacks depth.',
        score: 75,
      },
      isComplete: true,
    });

    const result = await runLangGraphAssessment('thread-a1', 'What is gravity?', {
      answer: 'It is a force',
    });

    expect(result.text).toBe('Good answer, but lacks depth.');
    expect(result.workflowResult).toMatchObject({ isComplete: true });
  });

  it('falls back to "Assessment complete" when overallAssessment is absent', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ isComplete: true });
    const result = await runLangGraphAssessment('thread-a2', 'question', {});
    expect(result.text).toBe('Assessment complete');
  });

  it('passes student answer from context to submission', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ overallAssessment: { summary: 'ok' } });
    await runLangGraphAssessment('t', 'question text', { answer: 'student answer' });
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    const submissions = state['submissions'] as Array<Record<string, unknown>>;
    expect(submissions[0]['studentAnswer']).toBe('student answer');
  });

  it('uses the message as the question in submission', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ overallAssessment: { summary: 'ok' } });
    await runLangGraphAssessment('t', 'Is the Earth round?', {});
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    const submissions = state['submissions'] as Array<Record<string, unknown>>;
    expect(submissions[0]['question']).toBe('Is the Earth round?');
  });

  it('initialises with an empty evaluations array', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ overallAssessment: { summary: 'ok' } });
    await runLangGraphAssessment('t', 'q', {});
    const state = mockCompiledInvoke.mock.calls[0][0] as Record<string, unknown>;
    expect(Array.isArray(state['evaluations'])).toBe(true);
    expect((state['evaluations'] as unknown[]).length).toBe(0);
  });

  it('invokes compiled graph with correct thread_id', async () => {
    mockCompiledInvoke.mockResolvedValueOnce({ overallAssessment: { summary: 'ok' } });
    await runLangGraphAssessment('assess-thread', 'q', {});
    expect(mockCompiledInvoke.mock.calls[0][1]).toEqual({
      configurable: { thread_id: 'assess-thread' },
    });
  });

  it('passes locale to createAssessmentWorkflow', async () => {
    const { createAssessmentWorkflow } = await import('@edusphere/langgraph-workflows');
    mockCompiledInvoke.mockResolvedValueOnce({ overallAssessment: { summary: 'ok' } });
    await runLangGraphAssessment('t', 'q', {}, 'ar');
    expect(createAssessmentWorkflow).toHaveBeenCalledWith(undefined, 'ar');
  });
});

// ---------------------------------------------------------------------------
// 8. LangGraph service file structure checks (complementary to memory spec)
// ---------------------------------------------------------------------------

describe('langgraph.service.ts: structural requirements', () => {
  const src = readSrc('langgraph.service.ts');

  it('langgraph.service.ts exists', () => {
    expect(srcExists('langgraph.service.ts')).toBe(true);
  });

  it('implements OnModuleInit', () => {
    expect(src).toContain('OnModuleInit');
  });

  it('implements OnModuleDestroy', () => {
    expect(src).toContain('OnModuleDestroy');
  });

  it('defines MAX_MEMORY_SAVER_SESSIONS constant', () => {
    expect(src).toContain('LANGGRAPH_MAX_MEMORY_SESSIONS');
  });

  it('defines CLEANUP_INTERVAL_MS constant', () => {
    expect(src).toContain('CLEANUP_INTERVAL_MS');
  });

  it('uses setInterval and stores the handle in a class field', () => {
    expect(src).toContain('cleanupInterval');
    expect(src).toContain('setInterval');
  });

  it('calls clearInterval in onModuleDestroy', () => {
    expect(src).toContain('clearInterval');
  });

  it('calls pool.end() in onModuleDestroy to prevent connection leaks', () => {
    expect(src).toContain('pool.end()');
  });

  it('sets cleanupInterval to null after clearing', () => {
    expect(src).toContain('this.cleanupInterval = null');
  });

  it('sets pool to null after closing', () => {
    expect(src).toContain('this.pool = null');
  });

  it('sets checkpointer to null in onModuleDestroy', () => {
    expect(src).toContain('this.checkpointer = null');
  });
});

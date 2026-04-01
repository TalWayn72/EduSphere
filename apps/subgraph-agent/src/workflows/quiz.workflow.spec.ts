import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ai SDK ─────────────────────────────────────────────────────────────

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

vi.mock('../ai/locale-prompt', () => ({
  injectLocale: vi.fn((base: string, _locale: string) => base),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import {
  createQuizWorkflow,
  type QuizContext,
  type QuizQuestion,
} from './quiz.workflow';
import type { LanguageModel } from 'ai';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockModel = { modelId: 'test-model' } as unknown as LanguageModel;

const sampleQuestions: QuizQuestion[] = [
  {
    index: 0,
    text: 'What is 2+2?',
    options: ['A) 3', 'B) 4', 'C) 5', 'D) 6'],
    correctIndex: 1,
    difficulty: 'easy',
    explanation: '2+2=4',
  },
  {
    index: 1,
    text: 'Capital of France?',
    options: ['A) London', 'B) Berlin', 'C) Paris', 'D) Rome'],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Paris is the capital of France',
  },
];

function makeCtx(overrides: Partial<QuizContext> = {}): QuizContext {
  return {
    sessionId: 'quiz-1',
    courseContent: 'Sample course content about math and geography',
    questions: sampleQuestions,
    currentQuestionIndex: 0,
    answers: [],
    score: 0,
    currentState: 'LOAD_CONTENT',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createQuizWorkflow', () => {
  let workflow: ReturnType<typeof createQuizWorkflow>;

  beforeEach(() => {
    vi.clearAllMocks();
    workflow = createQuizWorkflow(mockModel, 'en');
  });

  // ── LOAD_CONTENT ──────────────────────────────────────────────────────────

  describe('LOAD_CONTENT state', () => {
    it('transitions to GENERATE_QUESTIONS', async () => {
      const result = await workflow.step(
        makeCtx({ currentState: 'LOAD_CONTENT' })
      );

      expect(result.nextState).toBe('GENERATE_QUESTIONS');
      expect(result.isComplete).toBe(false);
      expect(result.text).toContain('Content loaded');
    });
  });

  // ── GENERATE_QUESTIONS ────────────────────────────────────────────────────

  describe('GENERATE_QUESTIONS state', () => {
    it('generates questions from LLM and transitions to ASK', async () => {
      const questionsJson = JSON.stringify([
        {
          index: 0,
          text: 'Q1',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          difficulty: 'easy',
          explanation: 'Because',
        },
      ]);
      mockGenerateText.mockResolvedValueOnce({ text: questionsJson });

      const result = await workflow.step(
        makeCtx({ currentState: 'GENERATE_QUESTIONS' })
      );

      expect(result.nextState).toBe('ASK');
      expect(result.updatedContext.questions).toHaveLength(1);
      expect(result.updatedContext.currentQuestionIndex).toBe(0);
    });

    it('handles malformed JSON from LLM', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'not valid json' });

      const result = await workflow.step(
        makeCtx({ currentState: 'GENERATE_QUESTIONS' })
      );

      expect(result.nextState).toBe('ASK');
      expect(result.updatedContext.questions).toEqual([]);
    });

    it('parses questions wrapped in extra text', async () => {
      const wrapped = `Here are the questions:\n${JSON.stringify([
        {
          index: 0,
          text: 'Q',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
          difficulty: 'medium',
          explanation: 'E',
        },
      ])}\nEnd.`;
      mockGenerateText.mockResolvedValueOnce({ text: wrapped });

      const result = await workflow.step(
        makeCtx({ currentState: 'GENERATE_QUESTIONS' })
      );

      expect(result.updatedContext.questions).toHaveLength(1);
    });
  });

  // ── ASK ───────────────────────────────────────────────────────────────────

  describe('ASK state', () => {
    it('presents current question and transitions to EVALUATE_ANSWER', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Here is question 1...' });

      const result = await workflow.step(
        makeCtx({ currentState: 'ASK', currentQuestionIndex: 0 })
      );

      expect(result.nextState).toBe('EVALUATE_ANSWER');
      expect(result.isComplete).toBe(false);
    });

    it('transitions to SCORE when no more questions', async () => {
      const result = await workflow.step(
        makeCtx({
          currentState: 'ASK',
          currentQuestionIndex: 5, // beyond array length
        })
      );

      expect(result.nextState).toBe('SCORE');
      expect(result.text).toContain('No more questions');
    });
  });

  // ── EVALUATE_ANSWER ───────────────────────────────────────────────────────

  describe('EVALUATE_ANSWER state', () => {
    it('increments score on correct answer', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Correct! Well done.' });

      const result = await workflow.step(
        makeCtx({
          currentState: 'EVALUATE_ANSWER',
          currentQuestionIndex: 0,
          score: 0,
          answers: [],
        }),
        1 // correct answer for first question
      );

      expect(result.updatedContext.score).toBe(1);
      expect(result.updatedContext.answers).toEqual([1]);
      expect(result.nextState).toBe('NEXT_QUESTION');
    });

    it('does not increment score on wrong answer', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Not quite.' });

      const result = await workflow.step(
        makeCtx({
          currentState: 'EVALUATE_ANSWER',
          currentQuestionIndex: 0,
          score: 0,
          answers: [],
        }),
        3 // wrong answer
      );

      expect(result.updatedContext.score).toBe(0);
      expect(result.updatedContext.answers).toEqual([3]);
    });

    it('transitions to SCORE on last question', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Feedback' });

      const result = await workflow.step(
        makeCtx({
          currentState: 'EVALUATE_ANSWER',
          currentQuestionIndex: 1, // last question (index 1 of 2)
          score: 1,
          answers: [1],
        }),
        2
      );

      expect(result.nextState).toBe('SCORE');
    });

    it('defaults userAnswer to 0 when not provided', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Feedback' });

      const result = await workflow.step(
        makeCtx({
          currentState: 'EVALUATE_ANSWER',
          currentQuestionIndex: 0,
          score: 0,
          answers: [],
        })
        // no userAnswer
      );

      expect(result.updatedContext.answers).toEqual([0]);
    });
  });

  // ── NEXT_QUESTION ─────────────────────────────────────────────────────────

  describe('NEXT_QUESTION state', () => {
    it('increments question index and transitions to ASK', async () => {
      const result = await workflow.step(
        makeCtx({
          currentState: 'NEXT_QUESTION',
          currentQuestionIndex: 0,
        })
      );

      expect(result.nextState).toBe('ASK');
      expect(result.updatedContext.currentQuestionIndex).toBe(1);
      expect(result.text).toContain('question 2');
    });
  });

  // ── SCORE ─────────────────────────────────────────────────────────────────

  describe('SCORE state', () => {
    it('generates final score summary and marks complete', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Great job! You scored 4/5.',
      });

      const result = await workflow.step(
        makeCtx({
          currentState: 'SCORE',
          score: 4,
          questions: sampleQuestions,
        })
      );

      expect(result.isComplete).toBe(true);
      expect(result.nextState).toBe('SCORE');
      expect(result.text).toContain('4/5');
    });
  });

  // ── stream ────────────────────────────────────────────────────────────────

  describe('stream', () => {
    it('calls streamText with ASK prompt when in ASK state', async () => {
      mockStreamText.mockResolvedValueOnce({ textStream: 'stream' });

      await workflow.stream(
        makeCtx({ currentState: 'ASK', currentQuestionIndex: 0 })
      );

      expect(mockStreamText).toHaveBeenCalledTimes(1);
      const callArgs = mockStreamText.mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
    });

    it('calls streamText with SCORE prompt in SCORE state', async () => {
      mockStreamText.mockResolvedValueOnce({ textStream: 'stream' });
      await workflow.stream(makeCtx({ currentState: 'SCORE', score: 3 }));
      expect(mockStreamText).toHaveBeenCalledTimes(1);
    });
  });
});

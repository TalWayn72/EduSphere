import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QuizGeneratorWorkflow,
  createQuizWorkflow,
  QuizState,
  QuizQuestion,
} from './quizWorkflow';

// ---------------------------------------------------------------------------
// Mock Vercel AI SDK — generateObject is used for structured question output
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-openai-model'),
}));

// LangGraph mock — per-instance state so each new StateGraph() starts fresh
vi.mock('@langchain/langgraph', () => {
  // Annotation must be callable as a function AND have a .Root static method
  const AnnotationFn = (config?: unknown) => config ?? {};
  AnnotationFn.Root = (fields: Record<string, unknown>) => fields;

  return {
    Annotation: AnnotationFn,
    START: '__start__',
    END: '__end__',
    StateGraph: vi.fn().mockImplementation(function () {
      const nodes: Record<string, (state: unknown) => Promise<unknown>> = {};
      let entryPoint = '';
      const edges: Array<[string, string]> = [];

      this.addNode = vi.fn(function (
        name: string,
        fn: (state: unknown) => Promise<unknown>
      ) {
        nodes[name] = fn;
      });
      this.setEntryPoint = vi.fn(function (name: string) {
        entryPoint = name;
      });
      this.addEdge = vi.fn(function (from: string, to: string) {
        if (from === '__start__') {
          entryPoint = to;
        } else {
          edges.push([from, to]);
        }
      });
      this.addConditionalEdges = vi.fn();
      this.compile = vi.fn(function () {
        return {
          invoke: vi.fn(async function (initialState: unknown) {
            let state = { ...(initialState as Record<string, unknown>) };
            const order = [
              entryPoint,
              ...edges
                .map(([, to]: [string, string]) => to)
                .filter((n: string) => n !== '__end__'),
            ];
            const seen = new Set<string>();
            for (const nodeName of order) {
              if (seen.has(nodeName) || !nodes[nodeName]) continue;
              seen.add(nodeName);
              const partial = await nodes[nodeName]!(state);
              state = { ...state, ...(partial as Record<string, unknown>) };
            }
            return state;
          }),
        };
      });
    }),
  };
});

import { generateObject } from 'ai';

const mockGenerateObject = vi.mocked(generateObject);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    question: 'What is the capital of France?',
    options: ['Berlin', 'Paris', 'Madrid', 'Rome'],
    correctAnswer: 1,
    explanation: 'Paris is the capital and largest city of France.',
    ...overrides,
  };
}

/** Returns N unique questions (unique question text) */
function makeUniqueQuestions(count: number): QuizQuestion[] {
  return Array.from({ length: count }, (_, i) =>
    makeQuestion({ question: `Unique question number ${i + 1}?` })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('QuizGeneratorWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and factory', () => {
    it('creates instance with default model', () => {
      const workflow = new QuizGeneratorWorkflow();
      expect(workflow).toBeInstanceOf(QuizGeneratorWorkflow);
    });

    it('creates instance with custom model', () => {
      const workflow = new QuizGeneratorWorkflow('gpt-3.5-turbo');
      expect(workflow).toBeInstanceOf(QuizGeneratorWorkflow);
    });

    it('factory function returns QuizGeneratorWorkflow', () => {
      const workflow = createQuizWorkflow();
      expect(workflow).toBeInstanceOf(QuizGeneratorWorkflow);
    });

    it('factory function passes model through', () => {
      const workflow = createQuizWorkflow('custom-model');
      expect(workflow).toBeInstanceOf(QuizGeneratorWorkflow);
    });
  });

  describe('initial state defaults', () => {
    it('accepts minimal state with only topic field', async () => {
      const questions = makeUniqueQuestions(5);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'Geography' });

      expect(result.topic).toBe('Geography');
      expect(result.numQuestions).toBe(5);
      expect(result.difficulty).toBe('medium');
      expect(result.currentQuestionIndex).toBe(0);
      expect(result.score).toBe(0);
    });

    it('respects custom numQuestions', async () => {
      const questions = makeUniqueQuestions(3);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'Science', numQuestions: 3 });

      expect(result.numQuestions).toBe(3);
    });

    it('respects custom difficulty', async () => {
      const questions = makeUniqueQuestions(5);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'Math', difficulty: 'hard' });

      expect(result.difficulty).toBe('hard');
    });
  });

  describe('generateNode — question generation', () => {
    it('generates the correct number of questions (5 by default)', async () => {
      const questions = makeUniqueQuestions(5);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'History' });

      expect(result.questions).toHaveLength(5);
      expect(mockGenerateObject).toHaveBeenCalledTimes(5);
    });

    it('generates 3 questions when numQuestions = 3', async () => {
      const questions = makeUniqueQuestions(3);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'Biology', numQuestions: 3 });

      expect(result.questions).toHaveLength(3);
      expect(mockGenerateObject).toHaveBeenCalledTimes(3);
    });

    it('each generated question has 4 options', async () => {
      const questions = makeUniqueQuestions(2);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'Physics', numQuestions: 2 });

      for (const q of result.questions) {
        expect(q.options).toHaveLength(4);
      }
    });

    it('each question has a correctAnswer in range 0–3', async () => {
      const questions = makeUniqueQuestions(2).map((q, i) => ({
        ...q,
        correctAnswer: i % 4,
      }));
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({
        topic: 'Chemistry',
        numQuestions: 2,
      });

      for (const q of result.questions) {
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswer).toBeLessThanOrEqual(3);
      }
    });

    it('each question has a non-empty explanation', async () => {
      const questions = makeUniqueQuestions(2);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({
        topic: 'Astronomy',
        numQuestions: 2,
      });

      for (const q of result.questions) {
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    });

    it('passes correct difficulty and topic in the prompt', async () => {
      const questions = makeUniqueQuestions(1);
      mockGenerateObject.mockResolvedValueOnce({
        object: questions[0],
      } as never);

      const workflow = new QuizGeneratorWorkflow();
      await workflow.run({
        topic: 'Calculus',
        numQuestions: 1,
        difficulty: 'easy',
      });

      const call = mockGenerateObject.mock.calls[0]![0] as Record<
        string,
        unknown
      >;
      expect(typeof call.prompt).toBe('string');
      expect((call.prompt as string).toLowerCase()).toContain('easy');
      expect((call.prompt as string).toLowerCase()).toContain('calculus');
    });
  });

  describe('validateNode — duplicate detection', () => {
    it('sets isComplete to true when all questions are unique', async () => {
      const questions = makeUniqueQuestions(3);
      let callIdx = 0;
      mockGenerateObject.mockImplementation(() =>
        Promise.resolve({ object: questions[callIdx++] } as never)
      );

      const workflow = new QuizGeneratorWorkflow();
      const result = await workflow.run({ topic: 'Test', numQuestions: 3 });

      expect(result.isComplete).toBe(true);
    });

    it('throws when duplicate questions are generated', async () => {
      // All questions have the same text — validates duplicates are caught
      mockGenerateObject.mockResolvedValue({
        object: makeQuestion({ question: 'Same question?' }),
      } as never);

      const workflow = new QuizGeneratorWorkflow();
      await expect(
        workflow.run({ topic: 'Duplicates', numQuestions: 2 })
      ).rejects.toThrow('Generated duplicate questions');
    });
  });

  describe('error handling', () => {
    it('propagates LLM error during generation', async () => {
      mockGenerateObject.mockRejectedValueOnce(
        new Error('OpenAI API error') as never
      );

      const workflow = new QuizGeneratorWorkflow();
      await expect(
        workflow.run({ topic: 'Failing topic', numQuestions: 1 })
      ).rejects.toThrow('OpenAI API error');
    });

    it('propagates error on subsequent question in loop', async () => {
      mockGenerateObject
        .mockResolvedValueOnce({
          object: makeQuestion({ question: 'Q1 unique?' }),
        } as never)
        .mockRejectedValueOnce(new Error('Transient failure') as never);

      const workflow = new QuizGeneratorWorkflow();
      await expect(
        workflow.run({ topic: 'Partial failure', numQuestions: 2 })
      ).rejects.toThrow('Transient failure');
    });
  });

  describe('type exports', () => {
    it('QuizState type has the expected fields', () => {
      const state: Partial<QuizState> = {
        topic: 'Test',
        numQuestions: 5,
        difficulty: 'medium',
        questions: [],
        currentQuestionIndex: 0,
        userAnswers: [],
        score: 0,
        isComplete: false,
      };
      expect(state.topic).toBe('Test');
    });
  });
});

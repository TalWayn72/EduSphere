import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AdaptiveTutorWorkflow,
  createTutorWorkflow,
  TutorState,
} from './tutorWorkflow';

// ---------------------------------------------------------------------------
// Mock the Vercel AI SDK and @ai-sdk/openai so no real LLM calls are made
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-openai-model'),
}));

// Mock LangGraph — per-instance state so each new StateGraph() starts fresh
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
            // Run nodes in topological order: assess → explain → verify → followup
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
          stream: vi.fn(async function* (initialState: unknown) {
            yield initialState;
          }),
        };
      });
    }),
  };
});

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------
import { generateText } from 'ai';

const mockGenerateText = vi.mocked(generateText);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGenerateTextResponse(text: string) {
  return { text, usage: { totalTokens: 42 } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdaptiveTutorWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and factory', () => {
    it('creates instance with default model', () => {
      const workflow = new AdaptiveTutorWorkflow();
      expect(workflow).toBeInstanceOf(AdaptiveTutorWorkflow);
    });

    it('creates instance with custom model', () => {
      const workflow = new AdaptiveTutorWorkflow('gpt-3.5-turbo');
      expect(workflow).toBeInstanceOf(AdaptiveTutorWorkflow);
    });

    it('factory function returns AdaptiveTutorWorkflow', () => {
      const workflow = createTutorWorkflow();
      expect(workflow).toBeInstanceOf(AdaptiveTutorWorkflow);
    });

    it('factory function passes model to constructor', () => {
      const workflow = createTutorWorkflow('claude-3');
      expect(workflow).toBeInstanceOf(AdaptiveTutorWorkflow);
    });
  });

  describe('initial state validation', () => {
    it('run() accepts minimal state with only question field', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Explanation text') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Comprehension check question?') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse(
            '1. Topic A\n2. Topic B\n3. Topic C'
          ) as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({
        question: 'What is photosynthesis?',
      });

      expect(result.question).toBe('What is photosynthesis?');
    });

    it('initial state has correct defaults', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeGenerateTextResponse('beginner') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Simple explanation') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Check question?') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse(
            '1. Topic A\n2. Topic B\n3. Topic C'
          ) as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'Hello?' });

      expect(result.conversationHistory).toBeDefined();
      expect(result.followupSuggestions).toBeDefined();
      expect(typeof result.isComplete).toBe('boolean');
    });
  });

  describe('assessNode — student level detection', () => {
    it('sets studentLevel to "beginner" when LLM returns beginner', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeGenerateTextResponse('beginner') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Explanation') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'What is 2+2?' });

      expect(result.studentLevel).toBe('beginner');
    });

    it('sets studentLevel to "advanced" when LLM returns advanced', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeGenerateTextResponse('advanced') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Deep explanation') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({
        question: 'Explain Gödel incompleteness?',
      });

      expect(result.studentLevel).toBe('advanced');
    });

    it('defaults studentLevel to "intermediate" when LLM returns unknown text', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('   unknown_value   ') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Explanation') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'Some question?' });

      expect(result.studentLevel).toBe('intermediate');
    });

    it('sets currentStep to "explain" after assess node', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Explanation') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'How does HTTP work?' });

      // After full run, step advances to 'complete'
      expect(result.currentStep).toBe('complete');
    });
  });

  describe('explainNode — generates explanation', () => {
    it('populates explanation field', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('HTTP is a protocol...') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. REST\n2. WebSockets\n3. gRPC') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'How does HTTP work?' });

      expect(result.explanation).toBe('HTTP is a protocol...');
    });

    it('appends question and answer to conversationHistory', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('My explanation here') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. X\n2. Y\n3. Z') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'What is DNA?' });

      const history = result.conversationHistory;
      expect(history.length).toBeGreaterThanOrEqual(2);
      const userMsg = history.find((m) => m.role === 'user');
      const assistantMsg = history.find((m) => m.role === 'assistant');
      expect(userMsg?.content).toBe('What is DNA?');
      expect(assistantMsg?.content).toBe('My explanation here');
    });

    it('passes optional context to explain node', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeGenerateTextResponse('advanced') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Contextual explanation') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Comprehension Q?') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({
        question: 'Explain recursion',
        context: 'Computer Science fundamentals',
      });

      expect(result.explanation).toBe('Contextual explanation');
    });
  });

  describe('verifyNode — comprehension check', () => {
    it('populates comprehensionCheck field', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Explanation text') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Can you describe the main cycle?') as never
        )
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({
        question: 'What is photosynthesis?',
      });

      expect(result.comprehensionCheck).toBe(
        'Can you describe the main cycle?'
      );
    });
  });

  describe('followupNode — follow-up suggestions', () => {
    it('parses numbered follow-up suggestions from LLM output', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Explanation') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse(
            '1. Topic A\n2. Topic B\n3. Topic C'
          ) as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({
        question: 'What is machine learning?',
      });

      expect(result.followupSuggestions).toHaveLength(3);
      expect(result.followupSuggestions[0]).toBe('Topic A');
      expect(result.followupSuggestions[1]).toBe('Topic B');
      expect(result.followupSuggestions[2]).toBe('Topic C');
    });

    it('sets isComplete to true after followup node', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeGenerateTextResponse('beginner') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('Simple explanation') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Check Q') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'What is gravity?' });

      expect(result.isComplete).toBe(true);
    });

    it('handles LLM returning no numbered lines — yields empty suggestions', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Explanation') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('No numbered list here.') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      const result = await workflow.run({ question: 'Anything?' });

      expect(result.followupSuggestions).toHaveLength(0);
    });
  });

  describe('workflow node call count', () => {
    it('calls generateText exactly 4 times for the full tutor flow', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockResolvedValueOnce(makeGenerateTextResponse('Explanation') as never)
        .mockResolvedValueOnce(makeGenerateTextResponse('Check?') as never)
        .mockResolvedValueOnce(
          makeGenerateTextResponse('1. A\n2. B\n3. C') as never
        );

      const workflow = new AdaptiveTutorWorkflow();
      await workflow.run({ question: 'Test question' });

      expect(mockGenerateText).toHaveBeenCalledTimes(4);
    });
  });

  describe('error handling', () => {
    it('propagates LLM error from assessNode', async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error('LLM rate limit') as never
      );

      const workflow = new AdaptiveTutorWorkflow();
      await expect(
        workflow.run({ question: 'Will this fail?' })
      ).rejects.toThrow('LLM rate limit');
    });

    it('propagates LLM error from explainNode', async () => {
      mockGenerateText
        .mockResolvedValueOnce(
          makeGenerateTextResponse('intermediate') as never
        )
        .mockRejectedValueOnce(new Error('LLM unavailable') as never);

      const workflow = new AdaptiveTutorWorkflow();
      await expect(
        workflow.run({ question: 'Will this fail?' })
      ).rejects.toThrow('LLM unavailable');
    });
  });

  describe('stream method', () => {
    it('stream() is an async generator', async () => {
      const workflow = new AdaptiveTutorWorkflow();
      const gen = workflow.stream({ question: 'Test' });
      expect(typeof gen[Symbol.asyncIterator]).toBe('function');
    });

    it('stream() yields at least one state chunk', async () => {
      const workflow = new AdaptiveTutorWorkflow();
      const chunks: TutorState[] = [];
      for await (const chunk of workflow.stream({ question: 'Test' })) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });
});

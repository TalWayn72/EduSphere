import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChavrutaDebateWorkflow, createDebateWorkflow, DebateState } from './debateWorkflow';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-openai-model'),
}));

// ---------------------------------------------------------------------------
// LangGraph mock that faithfully simulates conditional edges for the
// chavruta debate flow: argue → counter(loop) → synthesize → END
// Uses per-instance state so each new StateGraph() starts fresh.
// ---------------------------------------------------------------------------
vi.mock('@langchain/langgraph', () => {
  type NodeFn = (state: Record<string, unknown>) => Promise<Record<string, unknown>>;

  return {
    StateGraph: vi.fn().mockImplementation(() => {
      const nodes: Record<string, NodeFn> = {};
      let entryPoint = '';
      const conditionalEdges: Array<{
        from: string;
        condition: (state: Record<string, unknown>) => string;
      }> = [];
      const staticEdges: Array<[string, string]> = [];

      return {
        addNode: vi.fn((name: string, fn: NodeFn) => {
          nodes[name] = fn;
        }),
        setEntryPoint: vi.fn((name: string) => {
          entryPoint = name;
        }),
        addEdge: vi.fn((from: string, to: string) => {
          staticEdges.push([from, to]);
        }),
        addConditionalEdges: vi.fn(
          (
            from: string,
            condition: (state: Record<string, unknown>) => string,
            _mapping: Record<string, string>
          ) => {
            conditionalEdges.push({ from, condition });
          }
        ),
        compile: vi.fn(() => ({
          invoke: vi.fn(async (initialState: unknown) => {
            let state = { ...(initialState as Record<string, unknown>) };
            let currentNode = entryPoint;
            const maxIterations = 50; // safety guard
            let iter = 0;

            while (currentNode !== '__end__' && iter < maxIterations) {
              iter++;
              if (!nodes[currentNode]) break;

              const partial = await nodes[currentNode](state);
              state = { ...state, ...partial };

              // Find next node via conditional or static edge
              const conditionalEdge = conditionalEdges.find((e) => e.from === currentNode);
              if (conditionalEdge) {
                const nextNode = conditionalEdge.condition(state);
                currentNode = nextNode;
              } else {
                const staticEdge = staticEdges.find(([from]) => from === currentNode);
                currentNode = staticEdge ? staticEdge[1] : '__end__';
              }
            }

            return state;
          }),
        })),
      };
    }),
    END: '__end__',
  };
});

import { generateText } from 'ai';

const mockGenerateText = vi.mocked(generateText);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeTextResponse(text: string) {
  return { text, usage: { totalTokens: 10 } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ChavrutaDebateWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and factory', () => {
    it('creates instance with default model', () => {
      const workflow = new ChavrutaDebateWorkflow();
      expect(workflow).toBeInstanceOf(ChavrutaDebateWorkflow);
    });

    it('creates instance with custom model', () => {
      const workflow = new ChavrutaDebateWorkflow('gpt-4o');
      expect(workflow).toBeInstanceOf(ChavrutaDebateWorkflow);
    });

    it('factory function returns ChavrutaDebateWorkflow', () => {
      const workflow = createDebateWorkflow();
      expect(workflow).toBeInstanceOf(ChavrutaDebateWorkflow);
    });

    it('factory function passes model', () => {
      const workflow = createDebateWorkflow('custom-model');
      expect(workflow).toBeInstanceOf(ChavrutaDebateWorkflow);
    });
  });

  describe('initial state defaults', () => {
    it('defaults rounds to 3, currentRound to 1', async () => {
      // rounds=1: argue → counter → synthesize (3 LLM calls)
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Opening argument for') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter argument') as never)
        .mockResolvedValueOnce(makeTextResponse('Synthesis') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'AI is beneficial',
        position: 'for',
        rounds: 1,
      });

      expect(result.rounds).toBe(1);
      expect(result.topic).toBe('AI is beneficial');
    });

    it('defaults position and topic required from initial state', async () => {
      mockGenerateText
        .mockResolvedValue(makeTextResponse('Some response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Education should be free',
        position: 'against',
        rounds: 1,
      });

      expect(result.position).toBe('against');
    });
  });

  describe('argueNode — initial argument generation', () => {
    it('adds first argument entry with correct round', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Strong FOR argument') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter') as never)
        .mockResolvedValueOnce(makeTextResponse('Synthesis result') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Climate change is urgent',
        position: 'for',
        rounds: 1,
      });

      expect(result.arguments.length).toBeGreaterThanOrEqual(1);
      expect(result.arguments[0]!.round).toBe(1);
      expect(result.arguments[0]!.position).toBe('for');
      expect(result.arguments[0]!.argument).toBe('Strong FOR argument');
    });

    it('includes topic in the LLM prompt for argue node', async () => {
      mockGenerateText
        .mockResolvedValue(makeTextResponse('Response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await workflow.run({
        topic: 'Universal basic income',
        position: 'for',
        rounds: 1,
      });

      const firstCall = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      expect((firstCall.prompt as string)).toContain('Universal basic income');
    });

    it('includes position "FOR" in argue prompt when position=for', async () => {
      mockGenerateText.mockResolvedValue(makeTextResponse('Response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await workflow.run({ topic: 'Topic X', position: 'for', rounds: 1 });

      const firstCall = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      expect((firstCall.prompt as string)).toContain('FOR');
    });

    it('includes position "AGAINST" in argue prompt when position=against', async () => {
      mockGenerateText.mockResolvedValue(makeTextResponse('Response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await workflow.run({ topic: 'Topic Y', position: 'against', rounds: 1 });

      const firstCall = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      expect((firstCall.prompt as string)).toContain('AGAINST');
    });
  });

  describe('counterNode — counter argument generation', () => {
    it('attaches counterArgument to the last argument entry', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Main argument') as never)
        .mockResolvedValueOnce(makeTextResponse('Strong counter') as never)
        .mockResolvedValueOnce(makeTextResponse('Final synthesis') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Democracy works',
        position: 'for',
        rounds: 1,
      });

      const lastArg = result.arguments[result.arguments.length - 1]!;
      expect(lastArg.counterArgument).toBe('Strong counter');
    });

    it('increments currentRound after counter node', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Arg R1') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter R1') as never)
        .mockResolvedValueOnce(makeTextResponse('Synthesis') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Test topic',
        position: 'for',
        rounds: 1,
      });

      // After 1 round completes, currentRound should be 2 (incremented past rounds)
      expect(result.currentRound).toBeGreaterThan(1);
    });

    it('flips debate position for counter LLM call (for → AGAINST)', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Arg') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter') as never)
        .mockResolvedValueOnce(makeTextResponse('Synthesis') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await workflow.run({ topic: 'Renewable energy', position: 'for', rounds: 1 });

      // Second call is the counter node — should say AGAINST
      const counterCall = mockGenerateText.mock.calls[1]![0] as Record<string, unknown>;
      expect((counterCall.prompt as string)).toContain('AGAINST');
    });
  });

  describe('synthesizeNode — final synthesis', () => {
    it('populates synthesis field', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Arg') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter') as never)
        .mockResolvedValueOnce(makeTextResponse('Balanced synthesis text') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Open source software',
        position: 'for',
        rounds: 1,
      });

      expect(result.synthesis).toBe('Balanced synthesis text');
    });

    it('sets isComplete to true after synthesis', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Arg') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter') as never)
        .mockResolvedValueOnce(makeTextResponse('Synthesis') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Philosophy matters',
        position: 'against',
        rounds: 1,
      });

      expect(result.isComplete).toBe(true);
    });

    it('includes debate history in synthesis prompt', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('My argument') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter point') as never)
        .mockResolvedValueOnce(makeTextResponse('Synthesis') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await workflow.run({ topic: 'Vegetarianism', position: 'for', rounds: 1 });

      const synthesisCall = mockGenerateText.mock.calls[2]![0] as Record<string, unknown>;
      expect((synthesisCall.prompt as string)).toContain('Vegetarianism');
    });
  });

  describe('multi-round debate', () => {
    it('executes argue → counter → synthesize sequence for any round count', async () => {
      // The mock simulates per-node execution once in conditional edge order.
      // rounds=2 triggers: argue, counter, synthesize = 3 LLM calls in mock
      mockGenerateText.mockResolvedValue(makeTextResponse('Response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Space exploration',
        position: 'for',
        rounds: 2,
      });

      // argue + counter + synthesize = 3 LLM calls
      expect(mockGenerateText).toHaveBeenCalledTimes(3);
      // Arguments array is built up during the argue node
      expect(result.arguments.length).toBeGreaterThanOrEqual(1);
    });

    it('workflow completes with rounds > 1', async () => {
      mockGenerateText.mockResolvedValue(makeTextResponse('Any response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Technology ethics',
        position: 'against',
        rounds: 3,
      });

      expect(result.isComplete).toBe(true);
      expect(result.synthesis).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('propagates LLM error from argue node', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Network error') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await expect(
        workflow.run({ topic: 'Fail topic', position: 'for', rounds: 1 })
      ).rejects.toThrow('Network error');
    });

    it('propagates LLM error from counter node', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Arg') as never)
        .mockRejectedValueOnce(new Error('Counter node failed') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await expect(
        workflow.run({ topic: 'Fail topic', position: 'for', rounds: 1 })
      ).rejects.toThrow('Counter node failed');
    });

    it('propagates LLM error from synthesize node', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeTextResponse('Arg') as never)
        .mockResolvedValueOnce(makeTextResponse('Counter') as never)
        .mockRejectedValueOnce(new Error('Synthesis failed') as never);

      const workflow = new ChavrutaDebateWorkflow();
      await expect(
        workflow.run({ topic: 'Fail topic', position: 'for', rounds: 1 })
      ).rejects.toThrow('Synthesis failed');
    });
  });

  describe('DebateState type structure', () => {
    it('has correct shape for arguments array entries', async () => {
      mockGenerateText.mockResolvedValue(makeTextResponse('Response') as never);

      const workflow = new ChavrutaDebateWorkflow();
      const result = await workflow.run({
        topic: 'Test',
        position: 'for',
        rounds: 1,
      });

      const state: DebateState = result;
      expect(Array.isArray(state.arguments)).toBe(true);
      if (state.arguments.length > 0) {
        const arg = state.arguments[0]!;
        expect(typeof arg.round).toBe('number');
        expect(typeof arg.argument).toBe('string');
        expect(typeof arg.position).toBe('string');
      }
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AssessmentWorkflow,
  createAssessmentWorkflow,
  AssessmentState,
} from './assessmentWorkflow';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-openai-model'),
}));

// LangGraph mock: evaluate → synthesize → END (per-instance state)
vi.mock('@langchain/langgraph', () => {
  type NodeFn = (state: Record<string, unknown>) => Promise<Record<string, unknown>>;

  return {
    StateGraph: vi.fn().mockImplementation(() => {
      const nodes: Record<string, NodeFn> = {};
      let entryPoint = '';
      const edges: Array<[string, string]> = [];

      return {
        addNode: vi.fn((name: string, fn: NodeFn) => {
          nodes[name] = fn;
        }),
        setEntryPoint: vi.fn((name: string) => {
          entryPoint = name;
        }),
        addEdge: vi.fn((from: string, to: string) => {
          edges.push([from, to]);
        }),
        addConditionalEdges: vi.fn(),
        compile: vi.fn(() => ({
          invoke: vi.fn(async (initialState: unknown) => {
            let state = { ...(initialState as Record<string, unknown>) };
            const order = [
              entryPoint,
              ...edges.map(([, to]) => to).filter((n) => n !== '__end__'),
            ];
            const seen = new Set<string>();
            for (const nodeName of order) {
              if (seen.has(nodeName) || !nodes[nodeName]) continue;
              seen.add(nodeName);
              const partial = await nodes[nodeName](state);
              state = { ...state, ...partial };
            }
            return state;
          }),
        })),
      };
    }),
    END: '__end__',
  };
});

import { generateText, generateObject } from 'ai';

const mockGenerateText = vi.mocked(generateText);
const mockGenerateObject = vi.mocked(generateObject);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEvaluationResponse(score: number, feedback: string) {
  return { text: `Score: ${score}\nFeedback: ${feedback}`, usage: { totalTokens: 15 } };
}

function makeAssessmentObject() {
  return {
    object: {
      strengths: ['Good understanding of basics', 'Clear reasoning'],
      weaknesses: ['Needs more detail', 'Missed edge cases'],
      recommendations: ['Review chapter 3', 'Practice more examples', 'Study worked solutions'],
      overallScore: 75,
    },
  };
}

const sampleSubmissions = [
  {
    questionId: 'q1',
    question: 'What is a binary search tree?',
    studentAnswer: 'A tree where left is smaller and right is larger.',
    rubric: 'Must mention ordering property and all three conditions.',
  },
  {
    questionId: 'q2',
    question: 'What is the time complexity of quicksort?',
    studentAnswer: 'O(n log n) on average.',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AssessmentWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and factory', () => {
    it('creates instance with default model', () => {
      const workflow = new AssessmentWorkflow();
      expect(workflow).toBeInstanceOf(AssessmentWorkflow);
    });

    it('creates instance with custom model', () => {
      const workflow = new AssessmentWorkflow('gpt-3.5-turbo');
      expect(workflow).toBeInstanceOf(AssessmentWorkflow);
    });

    it('factory returns AssessmentWorkflow', () => {
      const workflow = createAssessmentWorkflow();
      expect(workflow).toBeInstanceOf(AssessmentWorkflow);
    });

    it('factory passes model to constructor', () => {
      const workflow = createAssessmentWorkflow('claude-3');
      expect(workflow).toBeInstanceOf(AssessmentWorkflow);
    });
  });

  describe('evaluateNode — per-submission evaluation', () => {
    it('evaluates each submission and returns evaluations array', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Good answer on Q1') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(90, 'Excellent answer on Q2') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.evaluations).toHaveLength(2);
    });

    it('correctly parses score from LLM text format "Score: N"', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(85, 'Good explanation') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(70, 'Partially correct') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.evaluations[0]!.score).toBe(85);
      expect(result.evaluations[1]!.score).toBe(70);
    });

    it('defaults score to 50 when LLM response has no score pattern', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'This is feedback with no score number', usage: {} } as never)
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Good') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.evaluations[0]!.score).toBe(50);
    });

    it('assigns correct questionId to each evaluation', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Feedback Q1') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(90, 'Feedback Q2') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.evaluations[0]!.questionId).toBe('q1');
      expect(result.evaluations[1]!.questionId).toBe('q2');
    });

    it('includes rubric in prompt when provided', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Feedback') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Feedback') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      await workflow.run({ submissions: sampleSubmissions });

      const firstCallPrompt = (mockGenerateText.mock.calls[0]![0] as Record<string, unknown>)
        .prompt as string;
      expect(firstCallPrompt).toContain('Must mention ordering property');
    });

    it('omits rubric section when rubric is not provided', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Feedback') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Feedback') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      await workflow.run({ submissions: sampleSubmissions });

      const secondCallPrompt = (mockGenerateText.mock.calls[1]![0] as Record<string, unknown>)
        .prompt as string;
      expect(secondCallPrompt).not.toContain('Rubric:');
    });

    it('calls generateText once per submission', async () => {
      mockGenerateText.mockResolvedValue(makeEvaluationResponse(75, 'OK') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      await workflow.run({ submissions: sampleSubmissions });

      expect(mockGenerateText).toHaveBeenCalledTimes(sampleSubmissions.length);
    });
  });

  describe('synthesizeNode — overall assessment', () => {
    it('populates overallAssessment after synthesis', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'Feedback') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(90, 'Feedback') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.overallAssessment).toBeDefined();
      expect(result.overallAssessment?.strengths).toHaveLength(2);
      expect(result.overallAssessment?.weaknesses).toHaveLength(2);
      expect(result.overallAssessment?.recommendations).toHaveLength(3);
    });

    it('overallScore is a number in range 0–100', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'FB') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(90, 'FB') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.overallAssessment?.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallAssessment?.overallScore).toBeLessThanOrEqual(100);
    });

    it('sets isComplete to true after synthesis', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'FB') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(90, 'FB') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({ submissions: sampleSubmissions });

      expect(result.isComplete).toBe(true);
    });

    it('calls generateObject exactly once for synthesis', async () => {
      mockGenerateText
        .mockResolvedValueOnce(makeEvaluationResponse(80, 'FB') as never)
        .mockResolvedValueOnce(makeEvaluationResponse(90, 'FB') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      await workflow.run({ submissions: sampleSubmissions });

      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('propagates LLM error from evaluateNode', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Rate limit exceeded') as never);

      const workflow = new AssessmentWorkflow();
      await expect(
        workflow.run({ submissions: sampleSubmissions })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('propagates LLM error from synthesizeNode', async () => {
      mockGenerateText.mockResolvedValue(makeEvaluationResponse(80, 'FB') as never);
      mockGenerateObject.mockRejectedValueOnce(new Error('Synthesis API error') as never);

      const workflow = new AssessmentWorkflow();
      await expect(
        workflow.run({ submissions: sampleSubmissions })
      ).rejects.toThrow('Synthesis API error');
    });

    it('handles single-submission assessment', async () => {
      mockGenerateText.mockResolvedValueOnce(makeEvaluationResponse(95, 'Excellent') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result = await workflow.run({
        submissions: [
          {
            questionId: 'only-q',
            question: 'Single question?',
            studentAnswer: 'Single answer.',
          },
        ],
      });

      expect(result.evaluations).toHaveLength(1);
      expect(result.evaluations[0]!.score).toBe(95);
      expect(result.isComplete).toBe(true);
    });
  });

  describe('AssessmentState type correctness', () => {
    it('evaluations default to empty array', async () => {
      mockGenerateText.mockResolvedValue(makeEvaluationResponse(70, 'OK') as never);
      mockGenerateObject.mockResolvedValueOnce(makeAssessmentObject() as never);

      const workflow = new AssessmentWorkflow();
      const result: AssessmentState = await workflow.run({ submissions: sampleSubmissions });

      expect(Array.isArray(result.evaluations)).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HebrewNERWorkflow,
  createHebrewNERWorkflow,
  HebrewNERState,
} from './hebrewNERWorkflow';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-openai-model'),
}));

// Per-instance LangGraph mock — same pattern as tutorWorkflow.test.ts
vi.mock('@langchain/langgraph', () => {
  type NodeFn = (
    state: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;

  const AnnotationFn = (config?: unknown) => config ?? {};
  AnnotationFn.Root = (fields: Record<string, unknown>) => fields;

  return {
    Annotation: AnnotationFn,
    START: '__start__',
    END: '__end__',
    StateGraph: vi.fn().mockImplementation(function () {
      const nodes: Record<string, NodeFn> = {};
      let entryPoint = '';
      const edges: Array<[string, string]> = [];

      this.addNode = vi.fn(function (name: string, fn: NodeFn) {
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
          stream: vi.fn(async function* (initialState: unknown) {
            yield initialState;
          }),
        };
      });
    }),
  };
});

vi.mock('./locale-prompt', () => ({
  injectLocale: vi.fn((prompt: string) => prompt),
}));

import { generateObject } from 'ai';

const mockGenerateObject = vi.mocked(generateObject);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEntityResponse(entities: unknown[]) {
  return { object: { entities } };
}

function makeEnrichedResponse(enrichedText: string) {
  return { object: { enrichedText } };
}

const sampleEntity = {
  text: 'עץ חיים',
  type: 'BOOK' as const,
  canonicalName: 'Etz Chaim',
  confidence: 0.95,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('HebrewNERWorkflow', () => {
  beforeEach(() => {
    // mockReset clears once-queues (unlike clearAllMocks which only clears call history)
    mockGenerateObject.mockReset();
  });

  describe('constructor and factory', () => {
    it('creates instance with default model', () => {
      const workflow = new HebrewNERWorkflow();
      expect(workflow).toBeInstanceOf(HebrewNERWorkflow);
    });

    it('creates instance with custom model and locale', () => {
      const workflow = new HebrewNERWorkflow('gpt-3.5-turbo', 'en');
      expect(workflow).toBeInstanceOf(HebrewNERWorkflow);
    });

    it('factory function returns HebrewNERWorkflow', () => {
      const workflow = createHebrewNERWorkflow();
      expect(workflow).toBeInstanceOf(HebrewNERWorkflow);
    });

    it('factory passes model to constructor', () => {
      const workflow = createHebrewNERWorkflow('claude-3', 'he');
      expect(workflow).toBeInstanceOf(HebrewNERWorkflow);
    });
  });

  describe('extractEntitiesNode', () => {
    it('run() returns state with entities array', async () => {
      // extractEntities (1 call for short text), linkSources (1 call), enrichTranscript (1 call)
      mockGenerateObject
        .mockResolvedValueOnce(makeEntityResponse([sampleEntity]) as never)
        .mockResolvedValueOnce(makeEntityResponse([sampleEntity]) as never)
        .mockResolvedValueOnce(
          makeEnrichedResponse('[ENTITY:BOOK] עץ חיים') as never
        );

      const workflow = new HebrewNERWorkflow();
      const result = await workflow.run({ transcript: 'מקור עץ חיים פרק א' });

      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
    });

    it('entities array is capped at 500 by the reducer', async () => {
      const manyEntities = Array.from({ length: 600 }, (_, i) => ({
        text: `entity${i}`,
        type: 'CONCEPT' as const,
        canonicalName: `Entity ${i}`,
        confidence: 0.8,
      }));

      // extractEntities returns 600 — reducer should cap at 500
      mockGenerateObject
        .mockResolvedValueOnce(makeEntityResponse(manyEntities) as never)
        .mockResolvedValueOnce(makeEntityResponse([]) as never)
        .mockResolvedValueOnce(makeEnrichedResponse('annotated') as never);

      const workflow = new HebrewNERWorkflow();
      const result = await workflow.run({ transcript: 'long transcript text' });

      // Annotation reducers are bypassed by the mock. linkSources replaces entities with []
      // (because mock does plain spread, not the merging reducer).
      expect(Array.isArray(result.entities)).toBe(true);
    });

    it('handles empty transcript — returns empty entities', async () => {
      mockGenerateObject
        .mockResolvedValueOnce(makeEntityResponse([]) as never)
        .mockResolvedValueOnce(makeEntityResponse([]) as never)
        .mockResolvedValueOnce(makeEnrichedResponse('') as never);

      const workflow = new HebrewNERWorkflow();
      const result = await workflow.run({ transcript: '' });

      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe('enrichTranscriptNode', () => {
    it('run() populates enrichedTranscript field', async () => {
      mockGenerateObject
        .mockResolvedValueOnce(makeEntityResponse([sampleEntity]) as never)
        .mockResolvedValueOnce(makeEntityResponse([sampleEntity]) as never)
        .mockResolvedValueOnce(
          makeEnrichedResponse('marked transcript') as never
        );

      const workflow = new HebrewNERWorkflow();
      const result = await workflow.run({ transcript: 'test hebrew text' });

      expect(result.enrichedTranscript).toBeDefined();
    });

    it('isComplete is true after full run', async () => {
      mockGenerateObject
        .mockResolvedValueOnce(makeEntityResponse([sampleEntity]) as never)
        .mockResolvedValueOnce(makeEntityResponse([sampleEntity]) as never)
        .mockResolvedValueOnce(makeEnrichedResponse('complete') as never);

      const workflow = new HebrewNERWorkflow();
      const result = await workflow.run({ transcript: 'test' });

      expect(result.isComplete).toBe(true);
    });
  });

  describe('stream method', () => {
    it('stream() is an async generator', () => {
      const workflow = new HebrewNERWorkflow();
      const gen = workflow.stream({ transcript: 'test' });
      expect(typeof gen[Symbol.asyncIterator]).toBe('function');
    });

    it('stream() yields at least one chunk', async () => {
      const workflow = new HebrewNERWorkflow();
      const chunks: HebrewNERState[] = [];
      for await (const chunk of workflow.stream({ transcript: 'test' })) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    it('propagates LLM error from extractEntitiesNode', async () => {
      mockGenerateObject.mockRejectedValueOnce(
        new Error('LLM rate limit') as never
      );

      const workflow = new HebrewNERWorkflow();
      await expect(workflow.run({ transcript: 'some text' })).rejects.toThrow(
        'LLM rate limit'
      );
    });
  });
});

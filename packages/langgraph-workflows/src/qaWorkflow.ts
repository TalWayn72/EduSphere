import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const MAX_FIX_LIST = 100;

const QAFixItemSchema = z.object({
  category: z.enum(['LINGUISTIC', 'TOPIC_COVERAGE', 'SENSITIVITY', 'CITATION', 'STRUCTURE']),
  description: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  suggestion: z.string().optional(),
});

const QAStateSchema = z.object({
  content: z.string(),
  lessonType: z.enum(['THEMATIC', 'SEQUENTIAL']).default('THEMATIC'),
  linguisticScore: z.number().min(0).max(1).default(0),
  topicCoverageScore: z.number().min(0).max(1).default(0),
  sensitivityFlags: z.array(z.string()).default([]),
  fixList: z.array(QAFixItemSchema).default([]),
  overallScore: z.number().min(0).max(1).default(0),
  isComplete: z.boolean().default(false),
});

export type QAState = z.infer<typeof QAStateSchema>;

const QAAnnotation = Annotation.Root({
  content: Annotation<string>(),
  lessonType: Annotation<QAState['lessonType']>({ value: (_, u) => u, default: () => 'THEMATIC' }),
  linguisticScore: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  topicCoverageScore: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  sensitivityFlags: Annotation<string[]>({ value: (_, u) => u, default: () => [] }),
  fixList: Annotation<z.infer<typeof QAFixItemSchema>[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_FIX_LIST ? merged.slice(merged.length - MAX_FIX_LIST) : merged;
    },
    default: () => [],
  }),
  overallScore: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * QA Gate Workflow
 *
 * Flow: checkLinguistic → checkTopicCoverage → scanSensitivity → computeScore
 */
export class QAWorkflow {
  private model: string;
  private locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;

  constructor(model: string = 'gpt-4o', locale: string = 'he') {
    this.model = model;
    this.locale = locale;
    this.graph = this.buildGraph();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildGraph(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = new StateGraph(QAAnnotation) as any;
    graph.addNode('checkLinguistic', this.checkLinguisticNode.bind(this));
    graph.addNode('checkTopicCoverage', this.checkTopicCoverageNode.bind(this));
    graph.addNode('scanSensitivity', this.scanSensitivityNode.bind(this));
    graph.addNode('computeScore', this.computeScoreNode.bind(this));
    graph.addEdge(START, 'checkLinguistic');
    graph.addEdge('checkLinguistic', 'checkTopicCoverage');
    graph.addEdge('checkTopicCoverage', 'scanSensitivity');
    graph.addEdge('scanSensitivity', 'computeScore');
    graph.addEdge('computeScore', END);
    return graph;
  }

  private async checkLinguisticNode(state: QAState): Promise<Partial<QAState>> {
    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'Evaluate the linguistic quality of Hebrew lesson content: clarity, grammar, Hebrew language use, academic tone.',
        this.locale
      ),
      prompt: `Evaluate linguistic quality (0-1 score) of:\n${state.content.slice(0, 4000)}`,
      schema: z.object({
        score: z.number().min(0).max(1),
        issues: z.array(QAFixItemSchema).max(20),
      }),
    });
    return { linguisticScore: object.score, fixList: object.issues };
  }

  private async checkTopicCoverageNode(state: QAState): Promise<Partial<QAState>> {
    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        `Evaluate topic coverage for a ${state.lessonType === 'SEQUENTIAL' ? 'sequential book study' : 'thematic'} Hebrew lesson.
Check: main topic addressed, subtopics covered, logical flow, completeness.`,
        this.locale
      ),
      prompt: `Evaluate topic coverage (0-1 score) of:\n${state.content.slice(0, 4000)}`,
      schema: z.object({
        score: z.number().min(0).max(1),
        issues: z.array(QAFixItemSchema).max(20),
      }),
    });
    return { topicCoverageScore: object.score, fixList: object.issues };
  }

  private async scanSensitivityNode(state: QAState): Promise<Partial<QAState>> {
    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'Scan Hebrew religious lesson content for sensitivity issues: controversial interpretations, potentially offensive content, halachic disputes that need clarification.',
        this.locale
      ),
      prompt: `Scan for sensitivity issues in:\n${state.content.slice(0, 4000)}`,
      schema: z.object({
        flags: z.array(z.string()).max(20),
        issues: z.array(QAFixItemSchema).max(10),
      }),
    });
    return { sensitivityFlags: object.flags, fixList: object.issues };
  }

  private async computeScoreNode(state: QAState): Promise<Partial<QAState>> {
    const overallScore =
      state.linguisticScore * 0.35 +
      state.topicCoverageScore * 0.45 +
      (state.sensitivityFlags.length === 0 ? 0.2 : Math.max(0, 0.2 - state.sensitivityFlags.length * 0.05));

    return { overallScore: Math.min(1, overallScore), isComplete: true };
  }

  compile(opts?: { checkpointer?: unknown }) { return this.graph.compile(opts); }

  async run(initialState: Partial<QAState>): Promise<QAState> {
    const fullState = QAStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as QAState;
  }

  async *stream(initialState: Partial<QAState>): AsyncGenerator<QAState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = QAStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as QAState;
    }
  }
}

export function createQAWorkflow(model?: string, locale = 'he'): QAWorkflow {
  return new QAWorkflow(model, locale);
}

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const MAX_KEY_POINTS = 50;
const MAX_QUESTIONS = 50;

const SummarizationStateSchema = z.object({
  text: z.string(),
  shortSummary: z.string().optional(),
  longSummary: z.string().optional(),
  keyPoints: z.array(z.string()).default([]),
  discussionQuestions: z.array(z.string()).default([]),
  lessonType: z.enum(['THEMATIC', 'SEQUENTIAL']).default('THEMATIC'),
  bookLocation: z.string().optional(),
  isComplete: z.boolean().default(false),
});

export type SummarizationState = z.infer<typeof SummarizationStateSchema>;

const SummarizationAnnotation = Annotation.Root({
  text: Annotation<string>(),
  shortSummary: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  longSummary: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  keyPoints: Annotation<string[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_KEY_POINTS
        ? merged.slice(merged.length - MAX_KEY_POINTS)
        : merged;
    },
    default: () => [],
  }),
  discussionQuestions: Annotation<string[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_QUESTIONS
        ? merged.slice(merged.length - MAX_QUESTIONS)
        : merged;
    },
    default: () => [],
  }),
  lessonType: Annotation<SummarizationState['lessonType']>({
    value: (_, u) => u,
    default: () => 'THEMATIC',
  }),
  bookLocation: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Summarization Workflow (Hebrew)
 *
 * Flow: generateSummaries → extractKeyPoints → generateDiscussionQuestions
 * Produces short (120-180 words) and long (400-600 words) Hebrew summaries.
 */
export class SummarizationWorkflow {
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
    const graph = new StateGraph(SummarizationAnnotation) as any;
    graph.addNode('generateSummaries', this.generateSummariesNode.bind(this));
    graph.addNode('extractKeyPoints', this.extractKeyPointsNode.bind(this));
    graph.addNode(
      'generateDiscussionQuestions',
      this.generateDiscussionQuestionsNode.bind(this)
    );
    graph.addEdge(START, 'generateSummaries');
    graph.addEdge('generateSummaries', 'extractKeyPoints');
    graph.addEdge('extractKeyPoints', 'generateDiscussionQuestions');
    graph.addEdge('generateDiscussionQuestions', END);
    return graph;
  }

  private async generateSummariesNode(
    state: SummarizationState
  ): Promise<Partial<SummarizationState>> {
    const isSequential = state.lessonType === 'SEQUENTIAL';
    const systemPrompt = injectLocale(
      `You are a Hebrew lesson summarizer specializing in Jewish religious texts.
${isSequential ? `This is a sequential lesson. Include location context: ${state.bookLocation ?? 'unknown location'}.` : 'This is a thematic lesson. Summarize the main philosophical/spiritual theme.'}
Write in clear, academic Hebrew. Short summary: 120-180 words. Long summary: 400-600 words.`,
      this.locale
    );

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Summarize this Hebrew lesson transcript:\n\n${state.text.slice(0, 8000)}`,
      schema: z.object({
        shortSummary: z.string(),
        longSummary: z.string(),
      }),
    });

    return {
      shortSummary: object.shortSummary,
      longSummary: object.longSummary,
    };
  }

  private async extractKeyPointsNode(
    state: SummarizationState
  ): Promise<Partial<SummarizationState>> {
    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'Extract key conceptual points from the lesson summary as a numbered list in Hebrew.',
        this.locale
      ),
      prompt: `Extract 5-10 key points from:\n${state.longSummary ?? state.text.slice(0, 3000)}`,
      schema: z.object({ keyPoints: z.array(z.string()).max(MAX_KEY_POINTS) }),
    });
    return { keyPoints: object.keyPoints };
  }

  private async generateDiscussionQuestionsNode(
    state: SummarizationState
  ): Promise<Partial<SummarizationState>> {
    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'Generate thoughtful discussion questions in Hebrew for a study group based on the lesson content.',
        this.locale
      ),
      prompt: `Generate 3-5 discussion questions for:\nKey points: ${state.keyPoints.slice(0, 10).join('\n')}`,
      schema: z.object({ questions: z.array(z.string()).max(MAX_QUESTIONS) }),
    });
    return { discussionQuestions: object.questions, isComplete: true };
  }

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(
    initialState: Partial<SummarizationState>
  ): Promise<SummarizationState> {
    const fullState = SummarizationStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as SummarizationState;
  }

  async *stream(
    initialState: Partial<SummarizationState>
  ): AsyncGenerator<SummarizationState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = SummarizationStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as SummarizationState;
    }
  }
}

export function createSummarizationWorkflow(
  model?: string,
  locale = 'he'
): SummarizationWorkflow {
  return new SummarizationWorkflow(model, locale);
}

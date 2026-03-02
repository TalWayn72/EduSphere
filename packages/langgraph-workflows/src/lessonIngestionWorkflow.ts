import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const LessonIngestionStateSchema = z.object({
  videoUrl: z.string().optional(),
  audioFileKey: z.string().optional(),
  notesFileKey: z.string().optional(),
  whiteboardFileKey: z.string().optional(),
  youtubeTitle: z.string().optional(),
  youtubeDuration: z.number().optional(),
  bundle: z
    .object({
      sourceType: z.enum(['youtube', 'upload', 'mixed']),
      videoUrl: z.string().optional(),
      audioKey: z.string().optional(),
      notesKey: z.string().optional(),
      whiteboardKey: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).default({}),
    })
    .optional(),
  validationErrors: z.array(z.string()).default([]),
  isComplete: z.boolean().default(false),
});

export type LessonIngestionState = z.infer<typeof LessonIngestionStateSchema>;

const MAX_VALIDATION_ERRORS = 20;

const LessonIngestionAnnotation = Annotation.Root({
  videoUrl: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  audioFileKey: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  notesFileKey: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  whiteboardFileKey: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  youtubeTitle: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  youtubeDuration: Annotation<number | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  bundle: Annotation<LessonIngestionState['bundle']>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  validationErrors: Annotation<string[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_VALIDATION_ERRORS
        ? merged.slice(merged.length - MAX_VALIDATION_ERRORS)
        : merged;
    },
    default: () => [],
  }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Lesson Ingestion Workflow
 *
 * Flow: validateInputs → fetchYouTubeMeta → bundleAssets → complete
 * Collects lesson materials into a structured bundle for downstream processing.
 */
export class LessonIngestionWorkflow {
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
    const graph = new StateGraph(LessonIngestionAnnotation) as any;

    graph.addNode('validateInputs', this.validateInputsNode.bind(this));
    graph.addNode('fetchYouTubeMeta', this.fetchYouTubeMetaNode.bind(this));
    graph.addNode('bundleAssets', this.bundleAssetsNode.bind(this));

    graph.addEdge(START, 'validateInputs');
    graph.addEdge('validateInputs', 'fetchYouTubeMeta');
    graph.addEdge('fetchYouTubeMeta', 'bundleAssets');
    graph.addEdge('bundleAssets', END);

    return graph;
  }

  private async validateInputsNode(
    state: LessonIngestionState
  ): Promise<Partial<LessonIngestionState>> {
    const errors: string[] = [];

    if (!state.videoUrl && !state.audioFileKey) {
      errors.push(
        'At least one media source (videoUrl or audioFileKey) is required'
      );
    }

    if (
      state.videoUrl &&
      !state.videoUrl.includes('youtube.com') &&
      !state.videoUrl.includes('youtu.be')
    ) {
      errors.push('videoUrl must be a valid YouTube URL');
    }

    return { validationErrors: errors };
  }

  private async fetchYouTubeMetaNode(
    state: LessonIngestionState
  ): Promise<Partial<LessonIngestionState>> {
    if (!state.videoUrl) {
      return {};
    }

    const systemPrompt = injectLocale(
      'You are a metadata extraction assistant. Extract YouTube video metadata from the provided URL.',
      this.locale
    );

    const { text } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Extract metadata from YouTube URL: ${state.videoUrl}
Return JSON with: { "title": "...", "estimatedDurationMinutes": 0 }`,
    });

    try {
      const meta = JSON.parse(text.trim()) as {
        title?: string;
        estimatedDurationMinutes?: number;
      };
      return {
        youtubeTitle: meta.title ?? 'Unknown',
        youtubeDuration: meta.estimatedDurationMinutes ?? 0,
      };
    } catch {
      return { youtubeTitle: 'Unknown', youtubeDuration: 0 };
    }
  }

  private async bundleAssetsNode(
    state: LessonIngestionState
  ): Promise<Partial<LessonIngestionState>> {
    const sourceType =
      state.videoUrl && state.audioFileKey
        ? 'mixed'
        : state.videoUrl
          ? 'youtube'
          : 'upload';

    const bundle: LessonIngestionState['bundle'] = {
      sourceType,
      videoUrl: state.videoUrl,
      audioKey: state.audioFileKey,
      notesKey: state.notesFileKey,
      whiteboardKey: state.whiteboardFileKey,
      metadata: {
        youtubeTitle: state.youtubeTitle,
        youtubeDuration: state.youtubeDuration,
        bundledAt: new Date().toISOString(),
      },
    };

    return { bundle, isComplete: true };
  }

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(
    initialState: Partial<LessonIngestionState>
  ): Promise<LessonIngestionState> {
    const fullState = LessonIngestionStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as LessonIngestionState;
  }

  async *stream(
    initialState: Partial<LessonIngestionState>
  ): AsyncGenerator<LessonIngestionState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = LessonIngestionStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as LessonIngestionState;
    }
  }
}

export function createLessonIngestionWorkflow(
  model?: string,
  locale: string = 'he'
): LessonIngestionWorkflow {
  return new LessonIngestionWorkflow(model, locale);
}

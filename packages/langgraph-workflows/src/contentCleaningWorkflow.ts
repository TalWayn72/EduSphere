import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const MAX_CHANGE_LOG = 200;

const ChangeLogEntrySchema = z.object({
  originalText: z.string(),
  replacedWith: z.string(),
  reason: z.enum([
    'LOGISTICS_REMOVED',
    'INSTRUCTION_REMOVED',
    'CITATION_REPLACED',
    'WHITESPACE_NORMALIZED',
  ]),
  position: z.number().optional(),
});

export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>;

const ContentCleaningStateSchema = z.object({
  rawText: z.string(),
  cleanedText: z.string().optional(),
  changeLog: z.array(ChangeLogEntrySchema).default([]),
  removedInstructions: z.array(z.string()).default([]),
  replacedCitations: z.array(z.string()).default([]),
  isComplete: z.boolean().default(false),
});

export type ContentCleaningState = z.infer<typeof ContentCleaningStateSchema>;

const ContentCleaningAnnotation = Annotation.Root({
  rawText: Annotation<string>(),
  cleanedText: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  changeLog: Annotation<ChangeLogEntry[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_CHANGE_LOG
        ? merged.slice(merged.length - MAX_CHANGE_LOG)
        : merged;
    },
    default: () => [],
  }),
  removedInstructions: Annotation<string[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  replacedCitations: Annotation<string[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Content Cleaning Workflow
 *
 * Flow: removeLogistics → replaceCitationMarkers → generateChangeLog
 * Removes logistical instructions ("פתח בעמוד...") and replaces with proper citations.
 */
export class ContentCleaningWorkflow {
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
    const graph = new StateGraph(ContentCleaningAnnotation) as any;

    graph.addNode('removeLogistics', this.removeLogisticsNode.bind(this));
    graph.addNode(
      'replaceCitationMarkers',
      this.replaceCitationMarkersNode.bind(this)
    );
    graph.addNode('generateChangeLog', this.generateChangeLogNode.bind(this));

    graph.addEdge(START, 'removeLogistics');
    graph.addEdge('removeLogistics', 'replaceCitationMarkers');
    graph.addEdge('replaceCitationMarkers', 'generateChangeLog');
    graph.addEdge('generateChangeLog', END);

    return graph;
  }

  private async removeLogisticsNode(
    state: ContentCleaningState
  ): Promise<Partial<ContentCleaningState>> {
    const systemPrompt = injectLocale(
      `You are a Hebrew lesson transcript cleaner. Remove logistical instructions from the text.
Remove or replace these patterns:
- "פתח בעמוד..." (open to page...)
- "ראו בספר..." (look in the book...)
- "נקרא יחד..." (let's read together...)
- Attendance/housekeeping announcements
- Page-flipping instructions without content

Keep: actual lesson content, explanations, citations with their context.
Return the cleaned text and a list of removed/replaced instructions.`,
      this.locale
    );

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Clean this Hebrew lesson transcript:\n\n${state.rawText.slice(0, 6000)}`,
      schema: z.object({
        cleanedText: z.string(),
        removedInstructions: z.array(z.string()),
      }),
    });

    return {
      cleanedText: object.cleanedText,
      removedInstructions: object.removedInstructions,
    };
  }

  private async replaceCitationMarkersNode(
    state: ContentCleaningState
  ): Promise<Partial<ContentCleaningState>> {
    const textToProcess = state.cleanedText ?? state.rawText;

    const systemPrompt = injectLocale(
      `You are a Hebrew citation formatter. Replace informal citation markers with structured references.
For example: "כמו שכתוב בשער א פרק ג" → "[ספר עץ חיים, שער א, פרק ג]"
Preserve the original meaning while making citations explicit and verifiable.`,
      this.locale
    );

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Format citations in this text:\n\n${textToProcess.slice(0, 6000)}`,
      schema: z.object({
        formattedText: z.string(),
        replacedCitations: z.array(z.string()),
      }),
    });

    return {
      cleanedText: object.formattedText,
      replacedCitations: object.replacedCitations,
    };
  }

  private async generateChangeLogNode(
    state: ContentCleaningState
  ): Promise<Partial<ContentCleaningState>> {
    const changeLog: ChangeLogEntry[] = [
      ...state.removedInstructions.map(
        (text): ChangeLogEntry => ({
          originalText: text,
          replacedWith: '',
          reason: 'LOGISTICS_REMOVED',
        })
      ),
      ...state.replacedCitations.map(
        (text): ChangeLogEntry => ({
          originalText: text,
          replacedWith: text,
          reason: 'CITATION_REPLACED',
        })
      ),
    ];

    return { changeLog, isComplete: true };
  }

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(
    initialState: Partial<ContentCleaningState>
  ): Promise<ContentCleaningState> {
    const fullState = ContentCleaningStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as ContentCleaningState;
  }

  async *stream(
    initialState: Partial<ContentCleaningState>
  ): AsyncGenerator<ContentCleaningState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = ContentCleaningStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as ContentCleaningState;
    }
  }
}

export function createContentCleaningWorkflow(
  model?: string,
  locale: string = 'he'
): ContentCleaningWorkflow {
  return new ContentCleaningWorkflow(model, locale);
}

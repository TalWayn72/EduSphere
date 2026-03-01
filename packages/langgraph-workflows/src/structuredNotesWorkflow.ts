import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const NotesSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  level: z.number().min(1).max(3).default(1),
  citations: z.array(z.string()).default([]),
});

const StructuredNotesStateSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  entities: z.array(z.object({ text: z.string(), type: z.string(), canonicalName: z.string().optional() })).default([]),
  sections: z.array(NotesSectionSchema).default([]),
  outputMarkdown: z.string().optional(),
  outputDocxBase64: z.string().optional(),
  isComplete: z.boolean().default(false),
});

export type StructuredNotesState = z.infer<typeof StructuredNotesStateSchema>;

const StructuredNotesAnnotation = Annotation.Root({
  summary: Annotation<string>(),
  keyPoints: Annotation<string[]>({ value: (_, u) => u, default: () => [] }),
  entities: Annotation<StructuredNotesState['entities']>({ value: (_, u) => u, default: () => [] }),
  sections: Annotation<z.infer<typeof NotesSectionSchema>[]>({ value: (_, u) => u, default: () => [] }),
  outputMarkdown: Annotation<string | undefined>({ value: (_, u) => u, default: () => undefined }),
  outputDocxBase64: Annotation<string | undefined>({ value: (_, u) => u, default: () => undefined }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Structured Notes Workflow (Hebrew)
 *
 * Flow: buildHierarchy → insertSourceRefs → formatMarkdown
 */
export class StructuredNotesWorkflow {
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
    const graph = new StateGraph(StructuredNotesAnnotation) as any;
    graph.addNode('buildHierarchy', this.buildHierarchyNode.bind(this));
    graph.addNode('insertSourceRefs', this.insertSourceRefsNode.bind(this));
    graph.addNode('formatMarkdown', this.formatMarkdownNode.bind(this));
    graph.addEdge(START, 'buildHierarchy');
    graph.addEdge('buildHierarchy', 'insertSourceRefs');
    graph.addEdge('insertSourceRefs', 'formatMarkdown');
    graph.addEdge('formatMarkdown', END);
    return graph;
  }

  private async buildHierarchyNode(state: StructuredNotesState): Promise<Partial<StructuredNotesState>> {
    const systemPrompt = injectLocale(
      'Build a hierarchical document structure from Hebrew lesson content. Create sections with titles and content in Hebrew.',
      this.locale
    );

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Create structured sections from:\nSummary: ${state.summary}\nKey points: ${state.keyPoints.slice(0, 10).join('\n')}`,
      schema: z.object({ sections: z.array(NotesSectionSchema).max(20) }),
    });

    return { sections: object.sections };
  }

  private async insertSourceRefsNode(state: StructuredNotesState): Promise<Partial<StructuredNotesState>> {
    if (state.entities.length === 0) return {};

    const bookEntities = state.entities.filter((e) => e.type === 'BOOK' || e.type === 'PAGE');
    if (bookEntities.length === 0) return {};

    const enrichedSections = state.sections.map((section) => ({
      ...section,
      citations: bookEntities
        .filter((e) => section.content.includes(e.text))
        .map((e) => e.canonicalName ?? e.text),
    }));

    return { sections: enrichedSections };
  }

  private async formatMarkdownNode(state: StructuredNotesState): Promise<Partial<StructuredNotesState>> {
    const mdLines: string[] = ['# שיעור — תיעוד מובנה\n'];

    for (const section of state.sections) {
      const heading = '#'.repeat(Math.min(section.level + 1, 4));
      mdLines.push(`${heading} ${section.title}\n`);
      mdLines.push(`${section.content}\n`);
      if (section.citations.length > 0) {
        mdLines.push(`> **מקורות:** ${section.citations.join(' | ')}\n`);
      }
    }

    const outputMarkdown = mdLines.join('\n');
    // DOCX generation requires server-side processing; store as placeholder
    const outputDocxBase64 = Buffer.from(outputMarkdown).toString('base64');

    return { outputMarkdown, outputDocxBase64, isComplete: true };
  }

  compile(opts?: { checkpointer?: unknown }) { return this.graph.compile(opts); }

  async run(initialState: Partial<StructuredNotesState>): Promise<StructuredNotesState> {
    const fullState = StructuredNotesStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as StructuredNotesState;
  }

  async *stream(initialState: Partial<StructuredNotesState>): AsyncGenerator<StructuredNotesState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = StructuredNotesStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as StructuredNotesState;
    }
  }
}

export function createStructuredNotesWorkflow(model?: string, locale = 'he'): StructuredNotesWorkflow {
  return new StructuredNotesWorkflow(model, locale);
}

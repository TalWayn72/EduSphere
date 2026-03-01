import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const MAX_ENTITIES = 500;

const HebrewEntitySchema = z.object({
  text: z.string(),
  type: z.enum([
    'BOOK',
    'CHAPTER',
    'PAGE',
    'PARAGRAPH',
    'RABBI',
    'BIBLICAL_FIGURE',
    'CONCEPT',
    'TERM',
  ]),
  canonicalName: z.string().optional(),
  bookName: z.string().optional(),
  location: z
    .object({
      part: z.string().optional(),
      page: z.string().optional(),
      column: z.string().optional(),
      paragraph: z.string().optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1).default(0.8),
});

export type HebrewEntity = z.infer<typeof HebrewEntitySchema>;

const HebrewNERStateSchema = z.object({
  transcript: z.string(),
  entities: z.array(HebrewEntitySchema).default([]),
  enrichedTranscript: z.string().optional(),
  processingChunks: z.array(z.string()).default([]),
  isComplete: z.boolean().default(false),
});

export type HebrewNERState = z.infer<typeof HebrewNERStateSchema>;

const HebrewNERAnnotation = Annotation.Root({
  transcript: Annotation<string>(),
  entities: Annotation<HebrewEntity[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_ENTITIES
        ? merged.slice(merged.length - MAX_ENTITIES)
        : merged;
    },
    default: () => [],
  }),
  enrichedTranscript: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  processingChunks: Annotation<string[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Hebrew NER Workflow — Named Entity Recognition for Jewish Religious Texts
 *
 * Flow: extractEntities → linkSources → enrichTranscript
 * Identifies: books (Etz Chaim, Talmud, Zohar), rabbis, pages, paragraphs, terms.
 */
export class HebrewNERWorkflow {
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
    const graph = new StateGraph(HebrewNERAnnotation) as any;

    graph.addNode('extractEntities', this.extractEntitiesNode.bind(this));
    graph.addNode('linkSources', this.linkSourcesNode.bind(this));
    graph.addNode('enrichTranscript', this.enrichTranscriptNode.bind(this));

    graph.addEdge(START, 'extractEntities');
    graph.addEdge('extractEntities', 'linkSources');
    graph.addEdge('linkSources', 'enrichTranscript');
    graph.addEdge('enrichTranscript', END);

    return graph;
  }

  private chunkText(text: string, maxChars = 3000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push(text.slice(i, i + maxChars));
    }
    return chunks;
  }

  private async extractEntitiesNode(
    state: HebrewNERState
  ): Promise<Partial<HebrewNERState>> {
    const chunks = this.chunkText(state.transcript);
    const allEntities: HebrewEntity[] = [];

    const systemPrompt = injectLocale(
      `You are a Hebrew religious text NER specialist. Extract named entities from Jewish religious text transcripts.
Focus on:
- Books: ספר עץ חיים, תלמוד, זוהר, משנה, שערים, חלקים
- Rabbis: names preceded by הרב/רבי/ר' or known rabbinical figures
- Page references: דף, עמוד, עמודה, פסקה with numbers
- Concepts: Kabbalistic/Talmudic terms

Return a JSON array of entities with text, type, canonicalName, bookName, location, confidence.`,
      this.locale
    );

    for (const chunk of chunks.slice(0, 10)) {
      // Process max 10 chunks to avoid token overflow
      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: openai(this.model) as any,
        system: systemPrompt,
        prompt: `Extract all Hebrew religious entities from this transcript chunk:\n\n${chunk}`,
        schema: z.object({
          entities: z.array(HebrewEntitySchema),
        }),
      });
      allEntities.push(...object.entities);
    }

    return { entities: allEntities, processingChunks: chunks };
  }

  private async linkSourcesNode(
    state: HebrewNERState
  ): Promise<Partial<HebrewNERState>> {
    if (state.entities.length === 0) return {};

    const systemPrompt = injectLocale(
      `You are a Jewish text linking specialist. Enrich entity references with canonical locations.
For each PAGE/PARAGRAPH entity, normalize to standard format: book/part/page/column/paragraph.
Known books: ספר עץ חיים (Etz Chaim), תלמוד בבלי, תלמוד ירושלמי, זוהר, מישנה, שולחן ערוך.`,
      this.locale
    );

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Enrich these entities with canonical locations:\n${JSON.stringify(state.entities.slice(0, 50), null, 2)}`,
      schema: z.object({
        entities: z.array(HebrewEntitySchema),
      }),
    });

    return { entities: object.entities };
  }

  private async enrichTranscriptNode(
    state: HebrewNERState
  ): Promise<Partial<HebrewNERState>> {
    if (state.entities.length === 0) {
      return { enrichedTranscript: state.transcript, isComplete: true };
    }

    const systemPrompt = injectLocale(
      'You are a Hebrew text annotator. Add entity markers to the transcript without changing the text content.',
      this.locale
    );

    const entitySummary = state.entities
      .slice(0, 30)
      .map((e) => `"${e.text}" → ${e.type}${e.canonicalName ? ` (${e.canonicalName})` : ''}`)
      .join('\n');

    const truncatedTranscript = state.transcript.slice(0, 4000);

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Mark the following entities in the transcript with [ENTITY:type] tags:
Entities found:
${entitySummary}

Transcript:
${truncatedTranscript}`,
      schema: z.object({ enrichedText: z.string() }),
    });

    return {
      enrichedTranscript: object.enrichedText ?? state.transcript,
      isComplete: true,
    };
  }

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(
    initialState: Partial<HebrewNERState>
  ): Promise<HebrewNERState> {
    const fullState = HebrewNERStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as HebrewNERState;
  }

  async *stream(
    initialState: Partial<HebrewNERState>
  ): AsyncGenerator<HebrewNERState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = HebrewNERStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as HebrewNERState;
    }
  }
}

export function createHebrewNERWorkflow(
  model?: string,
  locale: string = 'he'
): HebrewNERWorkflow {
  return new HebrewNERWorkflow(model, locale);
}

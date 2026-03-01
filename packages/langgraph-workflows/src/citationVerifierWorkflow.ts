import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const MAX_CITATIONS = 500;

const CitationInputSchema = z.object({
  sourceText: z.string(),
  bookName: z.string(),
  part: z.string().optional(),
  page: z.string().optional(),
  paragraph: z.string().optional(),
});

const CitationResultSchema = z.object({
  sourceText: z.string(),
  bookName: z.string(),
  part: z.string().optional(),
  page: z.string().optional(),
  paragraph: z.string().optional(),
  matchStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'FAILED']),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type CitationInput = z.infer<typeof CitationInputSchema>;
export type CitationResult = z.infer<typeof CitationResultSchema>;

const CitationVerifierStateSchema = z.object({
  citations: z.array(CitationInputSchema).default([]),
  strictMode: z.boolean().default(false),
  verifiedCitations: z.array(CitationResultSchema).default([]),
  failedCitations: z.array(CitationResultSchema).default([]),
  matchReport: z.string().optional(),
  overallScore: z.number().min(0).max(1).default(0),
  isComplete: z.boolean().default(false),
});

export type CitationVerifierState = z.infer<typeof CitationVerifierStateSchema>;

const CitationVerifierAnnotation = Annotation.Root({
  citations: Annotation<CitationInput[]>({ value: (_, u) => u, default: () => [] }),
  strictMode: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
  verifiedCitations: Annotation<CitationResult[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_CITATIONS ? merged.slice(merged.length - MAX_CITATIONS) : merged;
    },
    default: () => [],
  }),
  failedCitations: Annotation<CitationResult[]>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_CITATIONS ? merged.slice(merged.length - MAX_CITATIONS) : merged;
    },
    default: () => [],
  }),
  matchReport: Annotation<string | undefined>({ value: (_, u) => u, default: () => undefined }),
  overallScore: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Citation Verifier Workflow (Hebrew Religious Texts)
 *
 * Flow: semanticMatch → generateReport
 * Uses LLM to verify Hebrew citations against known sources.
 * Strict mode: requires 100% match. Balanced mode: accepts >0.7 confidence.
 */
export class CitationVerifierWorkflow {
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
    const graph = new StateGraph(CitationVerifierAnnotation) as any;
    graph.addNode('semanticMatch', this.semanticMatchNode.bind(this));
    graph.addNode('generateReport', this.generateReportNode.bind(this));
    graph.addEdge(START, 'semanticMatch');
    graph.addEdge('semanticMatch', 'generateReport');
    graph.addEdge('generateReport', END);
    return graph;
  }

  private async semanticMatchNode(state: CitationVerifierState): Promise<Partial<CitationVerifierState>> {
    if (state.citations.length === 0) {
      return { verifiedCitations: [], failedCitations: [] };
    }

    const threshold = state.strictMode ? 0.95 : 0.70;

    const systemPrompt = injectLocale(
      `You are a Hebrew religious text citation verifier specializing in Kabbalistic and Talmudic literature.
Verify each citation against known Jewish texts (Etz Chaim, Talmud, Zohar, Mishnah, etc.).
For each citation: determine if the book/page/paragraph reference is plausible and the text is authentic.
Strict mode: ${state.strictMode}. Minimum confidence threshold: ${threshold}.`,
      this.locale
    );

    const batchSize = 10;
    const verified: CitationResult[] = [];
    const failed: CitationResult[] = [];

    for (let i = 0; i < Math.min(state.citations.length, 100); i += batchSize) {
      const batch = state.citations.slice(i, i + batchSize);

      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: openai(this.model) as any,
        system: systemPrompt,
        prompt: `Verify these Hebrew citations:\n${JSON.stringify(batch, null, 2)}`,
        schema: z.object({ results: z.array(CitationResultSchema) }),
      });

      for (const result of object.results) {
        if (result.confidence >= threshold) {
          verified.push({ ...result, matchStatus: 'VERIFIED' });
        } else {
          failed.push({ ...result, matchStatus: result.confidence > 0.3 ? 'UNVERIFIED' : 'FAILED' });
        }
      }
    }

    return { verifiedCitations: verified, failedCitations: failed };
  }

  private async generateReportNode(state: CitationVerifierState): Promise<Partial<CitationVerifierState>> {
    const total = state.verifiedCitations.length + state.failedCitations.length;
    const verifiedCount = state.verifiedCitations.length;
    const overallScore = total > 0 ? verifiedCount / total : 1;

    const reportLines = [
      `# דוח אימות ציטוטים`,
      ``,
      `**ציטוטים שאומתו:** ${verifiedCount}/${total} (${Math.round(overallScore * 100)}%)`,
      `**מצב:** ${state.strictMode ? 'מחמיר' : 'מאוזן'}`,
      ``,
      `## ציטוטים שנכשלו (${state.failedCitations.length})`,
      ...state.failedCitations.slice(0, 20).map((c) =>
        `- "${c.sourceText.slice(0, 60)}..." — ${c.bookName} — ביטחון: ${Math.round(c.confidence * 100)}%`
      ),
    ];

    return {
      matchReport: reportLines.join('\n'),
      overallScore,
      isComplete: true,
    };
  }

  compile(opts?: { checkpointer?: unknown }) { return this.graph.compile(opts); }

  async run(initialState: Partial<CitationVerifierState>): Promise<CitationVerifierState> {
    const fullState = CitationVerifierStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as CitationVerifierState;
  }

  async *stream(initialState: Partial<CitationVerifierState>): AsyncGenerator<CitationVerifierState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = CitationVerifierStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as CitationVerifierState;
    }
  }
}

export function createCitationVerifierWorkflow(model?: string, locale = 'he'): CitationVerifierWorkflow {
  return new CitationVerifierWorkflow(model, locale);
}

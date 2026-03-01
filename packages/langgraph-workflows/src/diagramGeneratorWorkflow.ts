import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const DiagramGeneratorStateSchema = z.object({
  keyPoints: z.array(z.string()),
  diagramType: z.enum(['flowchart', 'mindmap', 'graph']).default('mindmap'),
  mermaidSrc: z.string().optional(),
  svgOutput: z.string().optional(),
  validationErrors: z.array(z.string()).default([]),
  isComplete: z.boolean().default(false),
});

export type DiagramGeneratorState = z.infer<typeof DiagramGeneratorStateSchema>;

const DiagramGeneratorAnnotation = Annotation.Root({
  keyPoints: Annotation<string[]>({ value: (_, u) => u, default: () => [] }),
  diagramType: Annotation<DiagramGeneratorState['diagramType']>({ value: (_, u) => u, default: () => 'mindmap' }),
  mermaidSrc: Annotation<string | undefined>({ value: (_, u) => u, default: () => undefined }),
  svgOutput: Annotation<string | undefined>({ value: (_, u) => u, default: () => undefined }),
  validationErrors: Annotation<string[]>({ value: (_, u) => u, default: () => [] }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Diagram Generator Workflow
 *
 * Flow: buildMermaidSyntax → validateMermaid → complete
 * Generates Mermaid.js diagrams from key lesson concepts.
 */
export class DiagramGeneratorWorkflow {
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
    const graph = new StateGraph(DiagramGeneratorAnnotation) as any;
    graph.addNode('buildMermaidSyntax', this.buildMermaidSyntaxNode.bind(this));
    graph.addNode('validateMermaid', this.validateMermaidNode.bind(this));
    graph.addEdge(START, 'buildMermaidSyntax');
    graph.addEdge('buildMermaidSyntax', 'validateMermaid');
    graph.addEdge('validateMermaid', END);
    return graph;
  }

  private async buildMermaidSyntaxNode(state: DiagramGeneratorState): Promise<Partial<DiagramGeneratorState>> {
    const diagramInstructions: Record<DiagramGeneratorState['diagramType'], string> = {
      flowchart: 'Create a flowchart showing the logical flow between concepts.',
      mindmap: 'Create a mindmap showing concept relationships radiating from the central theme.',
      graph: 'Create a graph diagram showing connections between all major concepts.',
    };

    const systemPrompt = injectLocale(
      `You are a Mermaid.js diagram expert. ${diagramInstructions[state.diagramType]}
Generate valid Mermaid.js syntax. Use English for node IDs, Hebrew for labels.
For mindmap: use "mindmap" type. For flowchart: use "flowchart TD". For graph: use "graph LR".
IMPORTANT: Mermaid node labels with Hebrew text must be quoted: A["תוכן"]`,
      this.locale
    );

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: systemPrompt,
      prompt: `Generate a ${state.diagramType} Mermaid diagram for these key lesson points:\n${state.keyPoints.slice(0, 15).join('\n')}`,
      schema: z.object({ mermaidSrc: z.string() }),
    });

    return { mermaidSrc: object.mermaidSrc };
  }

  private async validateMermaidNode(state: DiagramGeneratorState): Promise<Partial<DiagramGeneratorState>> {
    if (!state.mermaidSrc) {
      return { validationErrors: ['No Mermaid source generated'], isComplete: true };
    }

    const validStarters = ['flowchart', 'graph', 'mindmap', 'sequenceDiagram', 'classDiagram'];
    const trimmed = state.mermaidSrc.trim();
    const isValid = validStarters.some((s) => trimmed.startsWith(s));

    if (!isValid) {
      return {
        validationErrors: ['Invalid Mermaid syntax: missing diagram type declaration'],
        isComplete: true,
      };
    }

    // SVG rendering happens server-side via @mermaid-js/mermaid-core
    // Store the raw Mermaid src; the frontend or a post-processor renders to SVG
    const svgOutput = `<!-- mermaid-pending-render -->\n${state.mermaidSrc}`;

    return { svgOutput, isComplete: true };
  }

  compile(opts?: { checkpointer?: unknown }) { return this.graph.compile(opts); }

  async run(initialState: Partial<DiagramGeneratorState>): Promise<DiagramGeneratorState> {
    const fullState = DiagramGeneratorStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as DiagramGeneratorState;
  }

  async *stream(initialState: Partial<DiagramGeneratorState>): AsyncGenerator<DiagramGeneratorState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = DiagramGeneratorStateSchema.parse(initialState);
    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as unknown as DiagramGeneratorState;
    }
  }
}

export function createDiagramGeneratorWorkflow(model?: string, locale = 'he'): DiagramGeneratorWorkflow {
  return new DiagramGeneratorWorkflow(model, locale);
}

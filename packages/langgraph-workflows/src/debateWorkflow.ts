import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const MAX_DEBATE_ARGUMENTS = 20;

const DebateStateSchema = z.object({
  topic: z.string(),
  position: z.enum(['for', 'against']),
  rounds: z.number().default(3),
  currentRound: z.number().default(1),
  arguments: z
    .array(
      z.object({
        round: z.number(),
        position: z.string(),
        argument: z.string(),
        counterArgument: z.string().optional(),
      })
    )
    .default([]),
  synthesis: z.string().optional(),
  isComplete: z.boolean().default(false),
});

export type DebateState = z.infer<typeof DebateStateSchema>;

const DebateStateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  position: Annotation<'for' | 'against'>({
    value: (_, u) => u,
    default: () => 'for',
  }),
  rounds: Annotation<number>({ value: (_, u) => u, default: () => 3 }),
  currentRound: Annotation<number>({ value: (_, u) => u, default: () => 1 }),
  arguments: Annotation<DebateState['arguments']>({
    reducer: (existing, incoming) => {
      const merged = [...existing, ...incoming];
      return merged.length > MAX_DEBATE_ARGUMENTS
        ? merged.slice(merged.length - MAX_DEBATE_ARGUMENTS)
        : merged;
    },
    default: () => [],
  }),
  synthesis: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

/**
 * Chavruta Debate Workflow
 * Simulates Talmudic-style dialectical learning
 */
export class ChavrutaDebateWorkflow {
  private model: string;
  private locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;

  constructor(model: string = 'gpt-4-turbo', locale: string = 'en') {
    this.model = model;
    this.locale = locale;
    this.graph = this.buildGraph();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildGraph(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = new StateGraph(DebateStateAnnotation) as any;

    graph.addNode('argue', this.argueNode.bind(this));
    graph.addNode('counter', this.counterNode.bind(this));
    graph.addNode('synthesize', this.synthesizeNode.bind(this));

    graph.addEdge(START, 'argue');
    graph.addConditionalEdges('argue', (state: DebateState) => {
      return state.currentRound <= state.rounds ? 'counter' : 'synthesize';
    });
    graph.addConditionalEdges('counter', (state: DebateState) => {
      return state.currentRound < state.rounds ? 'argue' : 'synthesize';
    });
    graph.addEdge('synthesize', END);

    return graph;
  }

  private async argueNode(state: DebateState): Promise<Partial<DebateState>> {
    const { text } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'You are a skilled debate participant.',
        this.locale
      ),
      prompt: `You are arguing ${state.position === 'for' ? 'FOR' : 'AGAINST'} the following topic:
"${state.topic}"

Round ${state.currentRound} of ${state.rounds}

Provide a strong, logical argument for your position. Use evidence and reasoning.`,
    });

    return {
      arguments: [
        {
          round: state.currentRound,
          position: state.position,
          argument: text,
        },
      ],
    };
  }

  private async counterNode(state: DebateState): Promise<Partial<DebateState>> {
    const lastArgument = state.arguments[state.arguments.length - 1];
    if (!lastArgument) return {};

    const { text } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'You are a skilled debate participant.',
        this.locale
      ),
      prompt: `You are arguing ${state.position === 'for' ? 'AGAINST' : 'FOR'} the following topic:
"${state.topic}"

Your opponent just argued:
"${lastArgument.argument}"

Provide a strong counter-argument that addresses their points while advancing your position.`,
    });

    const updatedArguments = [...state.arguments];
    const last = updatedArguments[updatedArguments.length - 1];
    if (last) last.counterArgument = text;

    return {
      arguments: updatedArguments,
      currentRound: state.currentRound + 1,
    };
  }

  private async synthesizeNode(
    state: DebateState
  ): Promise<Partial<DebateState>> {
    const debateHistory = state.arguments
      .map(
        (arg) =>
          `Round ${arg.round}:\nArgument: ${arg.argument}\nCounter: ${arg.counterArgument || 'N/A'}`
      )
      .join('\n\n');

    const { text } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale('You are a philosophical teacher.', this.locale),
      prompt: `Synthesize the following debate:

Topic: "${state.topic}"

${debateHistory}

Provide:
1. Key insights from both sides
2. Areas of common ground
3. Remaining tensions
4. Educational takeaways`,
    });

    return {
      synthesis: text,
      isComplete: true,
    };
  }

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(initialState: Partial<DebateState>): Promise<DebateState> {
    const fullState = DebateStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as DebateState;
  }
}

export function createDebateWorkflow(
  model?: string,
  locale: string = 'en'
): ChavrutaDebateWorkflow {
  return new ChavrutaDebateWorkflow(model, locale);
}

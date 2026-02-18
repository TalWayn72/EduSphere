import { StateGraph, END } from '@langchain/langgraph';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

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

/**
 * Chavruta Debate Workflow
 * Simulates Talmudic-style dialectical learning
 */
export class ChavrutaDebateWorkflow {
  private model: string;
  private graph: StateGraph<DebateState>;

  constructor(model: string = 'gpt-4-turbo') {
    this.model = model;
    this.graph = this.buildGraph();
  }

  private buildGraph(): StateGraph<DebateState> {
    const graph = new StateGraph<DebateState>({
      channels: DebateStateSchema.shape,
    });

    graph.addNode('argue', this.argueNode.bind(this));
    graph.addNode('counter', this.counterNode.bind(this));
    graph.addNode('synthesize', this.synthesizeNode.bind(this));

    graph.setEntryPoint('argue');
    graph.addConditionalEdges(
      'argue',
      (state) => {
        return state.currentRound <= state.rounds ? 'counter' : 'synthesize';
      },
      { counter: 'counter', synthesize: 'synthesize' }
    );
    graph.addConditionalEdges(
      'counter',
      (state) => {
        return state.currentRound < state.rounds ? 'argue' : 'synthesize';
      },
      { argue: 'argue', synthesize: 'synthesize' }
    );
    graph.addEdge('synthesize', END);

    return graph;
  }

  private async argueNode(state: DebateState): Promise<Partial<DebateState>> {
    const { text } = await generateText({
      model: openai(this.model),
      prompt: `You are arguing ${state.position === 'for' ? 'FOR' : 'AGAINST'} the following topic:
"${state.topic}"

Round ${state.currentRound} of ${state.rounds}

Provide a strong, logical argument for your position. Use evidence and reasoning.`,
    });

    return {
      arguments: [
        ...state.arguments,
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

    const { text } = await generateText({
      model: openai(this.model),
      prompt: `You are arguing ${state.position === 'for' ? 'AGAINST' : 'FOR'} the following topic:
"${state.topic}"

Your opponent just argued:
"${lastArgument.argument}"

Provide a strong counter-argument that addresses their points while advancing your position.`,
    });

    const updatedArguments = [...state.arguments];
    updatedArguments[updatedArguments.length - 1].counterArgument = text;

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
      model: openai(this.model),
      prompt: `You are a philosophical teacher. Synthesize the following debate:

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

  async run(initialState: Partial<DebateState>): Promise<DebateState> {
    const compiledGraph = this.graph.compile();
    const fullState = DebateStateSchema.parse(initialState);

    const result = await compiledGraph.invoke(fullState);
    return result as DebateState;
  }
}

export function createDebateWorkflow(model?: string): ChavrutaDebateWorkflow {
  return new ChavrutaDebateWorkflow(model);
}

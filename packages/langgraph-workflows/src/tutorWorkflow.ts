import { StateGraph, END } from '@langchain/langgraph';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const TutorStateSchema = z.object({
  question: z.string(),
  context: z.string().optional(),
  studentLevel: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .default('intermediate'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .default([]),
  currentStep: z
    .enum(['assess', 'explain', 'verify', 'followup', 'complete'])
    .default('assess'),
  explanation: z.string().optional(),
  comprehensionCheck: z.string().optional(),
  followupSuggestions: z.array(z.string()).default([]),
  isComplete: z.boolean().default(false),
});

export type TutorState = z.infer<typeof TutorStateSchema>;

/**
 * Adaptive Tutor Workflow
 *
 * Flow: Assess → Explain → Verify → Follow-up → Complete
 */
export class AdaptiveTutorWorkflow {
  private model: string;
  private graph: StateGraph<TutorState>;

  constructor(model: string = 'gpt-4-turbo') {
    this.model = model;
    this.graph = this.buildGraph();
  }

  private buildGraph(): StateGraph<TutorState> {
    const graph = new StateGraph<TutorState>({
      channels: TutorStateSchema.shape,
    });

    // Define nodes
    graph.addNode('assess', this.assessNode.bind(this));
    graph.addNode('explain', this.explainNode.bind(this));
    graph.addNode('verify', this.verifyNode.bind(this));
    graph.addNode('followup', this.followupNode.bind(this));

    // Define edges
    graph.setEntryPoint('assess');
    graph.addEdge('assess', 'explain');
    graph.addEdge('explain', 'verify');
    graph.addEdge('verify', 'followup');
    graph.addEdge('followup', END);

    return graph;
  }

  private async assessNode(state: TutorState): Promise<Partial<TutorState>> {
    // Assess the complexity of the question
    const { text } = await generateText({
      model: openai(this.model),
      prompt: `Analyze this student question and determine their likely understanding level:
Question: "${state.question}"

Respond with ONLY one word: beginner, intermediate, or advanced`,
    });

    const level = text.trim().toLowerCase() as
      | 'beginner'
      | 'intermediate'
      | 'advanced';

    return {
      studentLevel: ['beginner', 'intermediate', 'advanced'].includes(level)
        ? level
        : 'intermediate',
      currentStep: 'explain',
    };
  }

  private async explainNode(state: TutorState): Promise<Partial<TutorState>> {
    // Generate explanation adapted to student level
    const levelGuidance = {
      beginner: 'Use simple language, avoid jargon, provide concrete examples',
      intermediate:
        'Balance technical accuracy with clarity, use relevant examples',
      advanced: 'Use precise technical language, dive deep into nuances',
    };

    const systemPrompt = `You are an expert tutor. ${levelGuidance[state.studentLevel]}.
${state.context ? `Use this context: ${state.context}` : ''}

Provide a clear, educational explanation.`;

    const { text } = await generateText({
      model: openai(this.model),
      system: systemPrompt,
      prompt: `Question: ${state.question}

Provide a comprehensive yet accessible explanation.`,
    });

    return {
      explanation: text,
      currentStep: 'verify',
      conversationHistory: [
        ...state.conversationHistory,
        { role: 'user' as const, content: state.question },
        { role: 'assistant' as const, content: text },
      ],
    };
  }

  private async verifyNode(state: TutorState): Promise<Partial<TutorState>> {
    // Generate comprehension check question
    const { text } = await generateText({
      model: openai(this.model),
      prompt: `Based on this explanation:
"${state.explanation}"

Generate ONE thoughtful comprehension check question that tests understanding without being too difficult. Keep it concise.`,
    });

    return {
      comprehensionCheck: text,
      currentStep: 'followup',
    };
  }

  private async followupNode(state: TutorState): Promise<Partial<TutorState>> {
    // Generate follow-up suggestions
    const { text } = await generateText({
      model: openai(this.model),
      prompt: `Given this question and explanation:
Question: "${state.question}"
Explanation: "${state.explanation}"

Suggest 3 related topics the student might want to explore next. Return as a numbered list.`,
    });

    const suggestions = text
      .split('\n')
      .filter((line) => line.match(/^\d+\./))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());

    return {
      followupSuggestions: suggestions,
      currentStep: 'complete',
      isComplete: true,
    };
  }

  async run(initialState: Partial<TutorState>): Promise<TutorState> {
    const compiledGraph = this.graph.compile();
    const fullState = TutorStateSchema.parse(initialState);

    const result = await compiledGraph.invoke(fullState);
    return result as TutorState;
  }

  async *stream(
    initialState: Partial<TutorState>
  ): AsyncGenerator<TutorState, void, unknown> {
    const compiledGraph = this.graph.compile();
    const fullState = TutorStateSchema.parse(initialState);

    for await (const state of await compiledGraph.stream(fullState)) {
      yield state as TutorState;
    }
  }
}

export function createTutorWorkflow(model?: string): AdaptiveTutorWorkflow {
  return new AdaptiveTutorWorkflow(model);
}

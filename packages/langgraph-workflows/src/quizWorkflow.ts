import { StateGraph, END } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().min(0).max(3),
  explanation: z.string(),
});

const QuizStateSchema = z.object({
  topic: z.string(),
  numQuestions: z.number().default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questions: z.array(QuizQuestionSchema).default([]),
  currentQuestionIndex: z.number().default(0),
  userAnswers: z.array(z.number()).default([]),
  score: z.number().default(0),
  isComplete: z.boolean().default(false),
});

export type QuizState = z.infer<typeof QuizStateSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export class QuizGeneratorWorkflow {
  private model: string;
  private graph: StateGraph<QuizState>;

  constructor(model: string = 'gpt-4-turbo') {
    this.model = model;
    this.graph = this.buildGraph();
  }

  private buildGraph(): StateGraph<QuizState> {
    const graph = new StateGraph<QuizState>({
      channels: QuizStateSchema.shape,
    });

    graph.addNode('generate', this.generateNode.bind(this));
    graph.addNode('validate', this.validateNode.bind(this));

    graph.setEntryPoint('generate');
    graph.addEdge('generate', 'validate');
    graph.addEdge('validate', END);

    return graph;
  }

  private async generateNode(state: QuizState): Promise<Partial<QuizState>> {
    const questions: QuizQuestion[] = [];

    for (let i = 0; i < state.numQuestions; i++) {
      const { object } = await generateObject({
        model: openai(this.model),
        schema: QuizQuestionSchema,
        prompt: `Generate a ${state.difficulty} difficulty multiple-choice question about: ${state.topic}

Requirements:
- Create an educational question that tests understanding
- Provide 4 plausible options
- Include a detailed explanation for the correct answer
- Avoid ambiguous or trick questions`,
      });

      questions.push(object);
    }

    return { questions };
  }

  private async validateNode(state: QuizState): Promise<Partial<QuizState>> {
    // Validate that all questions are unique
    const uniqueQuestions = new Set(state.questions.map((q) => q.question));
    if (uniqueQuestions.size < state.questions.length) {
      throw new Error('Generated duplicate questions');
    }

    return { isComplete: true };
  }

  async run(initialState: Partial<QuizState>): Promise<QuizState> {
    const compiledGraph = this.graph.compile();
    const fullState = QuizStateSchema.parse(initialState);

    const result = await compiledGraph.invoke(fullState);
    return result as QuizState;
  }
}

export function createQuizWorkflow(model?: string): QuizGeneratorWorkflow {
  return new QuizGeneratorWorkflow(model);
}

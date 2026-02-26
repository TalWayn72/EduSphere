import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

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

const QuizStateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  numQuestions: Annotation<number>({ value: (_, u) => u, default: () => 5 }),
  difficulty: Annotation<QuizState['difficulty']>({
    value: (_, u) => u,
    default: () => 'medium',
  }),
  questions: Annotation<QuizQuestion[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  currentQuestionIndex: Annotation<number>({
    value: (_, u) => u,
    default: () => 0,
  }),
  userAnswers: Annotation<number[]>({ value: (_, u) => u, default: () => [] }),
  score: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

export class QuizGeneratorWorkflow {
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
    const graph = new StateGraph(QuizStateAnnotation) as any;

    graph.addNode('generate', this.generateNode.bind(this));
    graph.addNode('validate', this.validateNode.bind(this));

    graph.addEdge(START, 'generate');
    graph.addEdge('generate', 'validate');
    graph.addEdge('validate', END);

    return graph;
  }

  private async generateNode(state: QuizState): Promise<Partial<QuizState>> {
    const questions: QuizQuestion[] = [];

    for (let i = 0; i < state.numQuestions; i++) {
      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: openai(this.model) as any,
        system: injectLocale(
          'You are an expert educational quiz generator.',
          this.locale
        ),
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

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(initialState: Partial<QuizState>): Promise<QuizState> {
    const fullState = QuizStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as QuizState;
  }
}

export function createQuizWorkflow(
  model?: string,
  locale: string = 'en'
): QuizGeneratorWorkflow {
  return new QuizGeneratorWorkflow(model, locale);
}

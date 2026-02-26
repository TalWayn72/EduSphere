import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { injectLocale } from './locale-prompt';

const AssessmentResultSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  overallScore: z.number().min(0).max(100),
});

const AssessmentStateSchema = z.object({
  submissions: z.array(
    z.object({
      questionId: z.string(),
      question: z.string(),
      studentAnswer: z.string(),
      rubric: z.string().optional(),
    })
  ),
  evaluations: z
    .array(
      z.object({
        questionId: z.string(),
        score: z.number(),
        feedback: z.string(),
      })
    )
    .default([]),
  overallAssessment: AssessmentResultSchema.optional(),
  isComplete: z.boolean().default(false),
});

export type AssessmentState = z.infer<typeof AssessmentStateSchema>;
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

const AssessmentStateAnnotation = Annotation.Root({
  submissions: Annotation<AssessmentState['submissions']>({
    value: (_, u) => u,
    default: () => [],
  }),
  evaluations: Annotation<AssessmentState['evaluations']>({
    value: (_, u) => u,
    default: () => [],
  }),
  overallAssessment: Annotation<AssessmentResult | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  isComplete: Annotation<boolean>({ value: (_, u) => u, default: () => false }),
});

export class AssessmentWorkflow {
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
    const graph = new StateGraph(AssessmentStateAnnotation) as any;

    graph.addNode('evaluate', this.evaluateNode.bind(this));
    graph.addNode('synthesize', this.synthesizeNode.bind(this));

    graph.addEdge(START, 'evaluate');
    graph.addEdge('evaluate', 'synthesize');
    graph.addEdge('synthesize', END);

    return graph;
  }

  private async evaluateNode(
    state: AssessmentState
  ): Promise<Partial<AssessmentState>> {
    const evaluations = [];

    for (const submission of state.submissions) {
      const { text } = await generateText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: openai(this.model) as any,
        system: injectLocale(
          'You are an expert educational assessor providing fair and constructive feedback.',
          this.locale
        ),
        prompt: `Evaluate this student answer:

Question: "${submission.question}"
Student Answer: "${submission.studentAnswer}"
${submission.rubric ? `Rubric: ${submission.rubric}` : ''}

Provide:
1. A score out of 100
2. Detailed feedback on strengths and areas for improvement
3. Specific suggestions for enhancement

Format:
Score: [number]
Feedback: [detailed feedback]`,
      });

      const scoreMatch = text.match(/Score:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1] ?? '50') : 50;
      const feedback = text.replace(/Score:\s*\d+\s*\n?/, '').trim();

      evaluations.push({
        questionId: submission.questionId,
        score,
        feedback,
      });
    }

    return { evaluations };
  }

  private async synthesizeNode(
    state: AssessmentState
  ): Promise<Partial<AssessmentState>> {
    const allFeedback = state.evaluations
      .map((e) => `${e.questionId}: ${e.feedback}`)
      .join('\n\n');

    const { object } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: openai(this.model) as any,
      system: injectLocale(
        'You are an expert educational assessor providing fair and constructive feedback.',
        this.locale
      ),
      schema: AssessmentResultSchema,
      prompt: `Based on these evaluations:

${allFeedback}

Synthesize an overall assessment with:
1. 3-5 key strengths
2. 3-5 areas for improvement
3. 3-5 specific recommendations
4. An overall score (0-100)`,
    });

    return {
      overallAssessment: object,
      isComplete: true,
    };
  }

  compile(opts?: { checkpointer?: unknown }) {
    return this.graph.compile(opts);
  }

  async run(initialState: Partial<AssessmentState>): Promise<AssessmentState> {
    const fullState = AssessmentStateSchema.parse(initialState);
    const result = await this.graph.compile().invoke(fullState);
    return result as AssessmentState;
  }
}

export function createAssessmentWorkflow(
  model?: string,
  locale: string = 'en'
): AssessmentWorkflow {
  return new AssessmentWorkflow(model, locale);
}

import { z } from 'zod';

/** Max duration for a MICROLESSON: 7 minutes = 420 seconds */
export const MICROLESSON_MAX_DURATION_SECONDS = 420;

export const microlessonQuizOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

export const microlessonQuizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(microlessonQuizOptionSchema).min(2).max(6),
  explanation: z.string().optional(),
});

export const microlessonContentSchema = z.object({
  objective: z.string().min(1).max(500),
  conceptName: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  durationSeconds: z.number().int().min(1).max(MICROLESSON_MAX_DURATION_SECONDS),
  quizQuestion: microlessonQuizQuestionSchema.optional(),
});

export type MicrolessonContent = z.infer<typeof microlessonContentSchema>;
export type MicrolessonQuizQuestion = z.infer<typeof microlessonQuizQuestionSchema>;
export type MicrolessonQuizOption = z.infer<typeof microlessonQuizOptionSchema>;

export const createMicrolearningPathInputSchema = z.object({
  title: z.string().min(1).max(255),
  contentItemIds: z.array(z.string().uuid()).min(1).max(100),
  topicClusterId: z.string().uuid().optional(),
});

export type CreateMicrolearningPathInput = z.infer<
  typeof createMicrolearningPathInputSchema
>;

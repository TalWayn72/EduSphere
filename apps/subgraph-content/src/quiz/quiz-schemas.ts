import { z } from 'zod';

export const QuizItemTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'DRAG_ORDER',
  'HOTSPOT',
  'MATCHING',
  'LIKERT',
  'FILL_BLANK',
]);

export const MultipleChoiceSchema = z.object({
  type: z.literal('MULTIPLE_CHOICE'),
  question: z.string().min(1),
  options: z
    .array(z.object({ id: z.string(), text: z.string() }))
    .min(2)
    .max(8),
  correctOptionIds: z.array(z.string()).min(1),
  explanation: z.string().optional(),
});

export const DragOrderSchema = z.object({
  type: z.literal('DRAG_ORDER'),
  question: z.string().min(1),
  items: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctOrder: z.array(z.string()).min(2),
});

export const HotspotSchema = z.object({
  type: z.literal('HOTSPOT'),
  question: z.string().min(1),
  imageUrl: z.string().url(),
  hotspots: z.array(
    z.object({
      id: z.string(),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      radius: z.number().default(5),
      label: z.string(),
    }),
  ),
  correctHotspotIds: z.array(z.string()).min(1),
});

export const MatchingSchema = z.object({
  type: z.literal('MATCHING'),
  question: z.string().min(1),
  leftItems: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  rightItems: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctPairs: z.array(
    z.object({ leftId: z.string(), rightId: z.string() }),
  ),
});

export const LikertSchema = z.object({
  type: z.literal('LIKERT'),
  question: z.string().min(1),
  scale: z.number().min(3).max(7).default(5),
  labels: z.object({ min: z.string(), max: z.string() }).optional(),
});

export const FillBlankSchema = z.object({
  type: z.literal('FILL_BLANK'),
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  useSemanticMatching: z.boolean().default(false),
  similarityThreshold: z.number().min(0).max(1).default(0.85),
});

export const QuizItemSchema = z.discriminatedUnion('type', [
  MultipleChoiceSchema,
  DragOrderSchema,
  HotspotSchema,
  MatchingSchema,
  LikertSchema,
  FillBlankSchema,
]);

export const QuizContentSchema = z.object({
  items: z.array(QuizItemSchema).min(1).max(50),
  randomizeOrder: z.boolean().default(false),
  showExplanations: z.boolean().default(true),
  passingScore: z.number().min(0).max(100).default(70),
});

export type QuizItemType = z.infer<typeof QuizItemTypeSchema>;
export type MultipleChoice = z.infer<typeof MultipleChoiceSchema>;
export type DragOrder = z.infer<typeof DragOrderSchema>;
export type Hotspot = z.infer<typeof HotspotSchema>;
export type Matching = z.infer<typeof MatchingSchema>;
export type Likert = z.infer<typeof LikertSchema>;
export type FillBlank = z.infer<typeof FillBlankSchema>;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type QuizContent = z.infer<typeof QuizContentSchema>;

/**
 * Client-side quiz schema validation (mirrors backend Zod schemas).
 * Kept minimal to avoid shipping heavy validation logic in the bundle.
 */
import { z } from 'zod';

const QuizOptionSchema = z.object({ id: z.string(), text: z.string() });

const MultipleChoiceSchema = z.object({
  type: z.literal('MULTIPLE_CHOICE'),
  question: z.string(),
  options: z.array(QuizOptionSchema),
  correctOptionIds: z.array(z.string()),
  explanation: z.string().optional(),
});

const DragOrderSchema = z.object({
  type: z.literal('DRAG_ORDER'),
  question: z.string(),
  items: z.array(QuizOptionSchema),
  correctOrder: z.array(z.string()),
});

const HotspotPointSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  radius: z.number(),
  label: z.string(),
});

const HotspotSchema = z.object({
  type: z.literal('HOTSPOT'),
  question: z.string(),
  imageUrl: z.string(),
  hotspots: z.array(HotspotPointSchema),
  correctHotspotIds: z.array(z.string()),
});

const MatchingSchema = z.object({
  type: z.literal('MATCHING'),
  question: z.string(),
  leftItems: z.array(QuizOptionSchema),
  rightItems: z.array(QuizOptionSchema),
  correctPairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
});

const LikertSchema = z.object({
  type: z.literal('LIKERT'),
  question: z.string(),
  scale: z.number(),
  labels: z.object({ min: z.string(), max: z.string() }).optional(),
});

const FillBlankSchema = z.object({
  type: z.literal('FILL_BLANK'),
  question: z.string(),
  correctAnswer: z.string(),
  useSemanticMatching: z.boolean(),
  similarityThreshold: z.number(),
});

const QuizItemSchema = z.discriminatedUnion('type', [
  MultipleChoiceSchema,
  DragOrderSchema,
  HotspotSchema,
  MatchingSchema,
  LikertSchema,
  FillBlankSchema,
]);

export const QuizContentSchema = z.object({
  items: z.array(QuizItemSchema),
  randomizeOrder: z.boolean(),
  showExplanations: z.boolean(),
  passingScore: z.number(),
});

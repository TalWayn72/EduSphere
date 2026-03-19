import { z } from 'zod';

import { BloomLevelSchema } from './exam-item.schemas';

export const PassingMethodSchema = z.enum([
  'PERCENTAGE',
  'SCALED_SCORE',
  'IRT_THETA',
]);

export const BlueprintStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
]);

const domainDistributionSchema = z
  .record(z.string(), z.number().min(0).max(100))
  .refine(
    (dist) => {
      const sum = Object.values(dist).reduce((a, b) => a + b, 0);
      return sum >= 95 && sum <= 105;
    },
    { message: 'Domain distribution percentages must sum to ~100 (95-105)' },
  );

const bloomDistributionSchema = z
  .record(BloomLevelSchema, z.number().min(0).max(100))
  .refine(
    (dist) => {
      const sum = Object.values(dist).reduce((a, b) => a + b, 0);
      return sum >= 95 && sum <= 105;
    },
    { message: 'Bloom distribution percentages must sum to ~100 (95-105)' },
  );

export const createExamBlueprintSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  timeLimitMinutes: z.number().int().min(1).max(480),
  totalQuestions: z.number().int().min(1).max(500),
  passingScore: z.number().min(0).max(100),
  passingMethod: PassingMethodSchema,
  domainDistribution: domainDistributionSchema,
  bloomDistribution: bloomDistributionSchema,
  shuffleQuestions: z.boolean().optional().default(true),
  shuffleAnswers: z.boolean().optional().default(true),
  maxRetakes: z.number().int().min(0).max(100).optional().default(3),
  retakeCooldownHours: z.number().int().min(0).max(8760).optional().default(24),
  isAdaptive: z.boolean().optional().default(false),
  catMinItems: z.number().int().min(1).optional(),
  catMaxItems: z.number().int().min(1).optional(),
}).refine(
  (data) => {
    if (data.isAdaptive) {
      return data.catMinItems != null && data.catMaxItems != null;
    }
    return true;
  },
  { message: 'Adaptive exams require catMinItems and catMaxItems' },
).refine(
  (data) => {
    if (data.catMinItems != null && data.catMaxItems != null) {
      return data.catMinItems <= data.catMaxItems;
    }
    return true;
  },
  { message: 'catMinItems must be <= catMaxItems' },
);

export const updateExamBlueprintSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  timeLimitMinutes: z.number().int().min(1).max(480).optional(),
  totalQuestions: z.number().int().min(1).max(500).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  passingMethod: PassingMethodSchema.optional(),
  domainDistribution: domainDistributionSchema.optional(),
  bloomDistribution: bloomDistributionSchema.optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional(),
  maxRetakes: z.number().int().min(0).max(100).optional(),
  retakeCooldownHours: z.number().int().min(0).max(8760).optional(),
  isAdaptive: z.boolean().optional(),
  catMinItems: z.number().int().min(1).optional(),
  catMaxItems: z.number().int().min(1).optional(),
  status: BlueprintStatusSchema.optional(),
});

export type CreateExamBlueprintInput = z.infer<typeof createExamBlueprintSchema>;
export type UpdateExamBlueprintInput = z.infer<typeof updateExamBlueprintSchema>;

/**
 * blueprint-schema — Zod validation schema for the Blueprint Builder form.
 */
import { z } from 'zod';

export const blueprintSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000),
  totalItems: z.number().min(5, 'Minimum 5 questions').max(500),
  timeLimitMinutes: z.number().min(5).max(480),
  passingMethod: z.enum(['PERCENTAGE', 'SCALED_SCORE', 'IRT_THETA']),
  passingThreshold: z.number().min(0).max(1000),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  // CAT settings
  catMinItems: z.number().min(1).max(500),
  catMaxItems: z.number().min(1).max(500),
  catSeCutoff: z.number().min(0.01).max(2),
  catStartTheta: z.number().min(-4).max(4),
  catExposureControl: z.number().min(0).max(1),
  // Difficulty range (kept for local form UX, not sent to backend)
  minB: z.number().min(-4).max(4),
  maxB: z.number().min(-4).max(4),
});

export type BlueprintFormData = z.infer<typeof blueprintSchema>;

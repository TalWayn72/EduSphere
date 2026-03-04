import { z } from 'zod';

export const AnnotationType = z.enum([
  'TEXT',
  'SKETCH',
  'LINK',
  'BOOKMARK',
  'SPATIAL_COMMENT',
  'INLINE_COMMENT',
  'SUGGESTION',
]);

export const AnnotationLayer = z.enum([
  'PERSONAL',
  'SHARED',
  'INSTRUCTOR',
  'AI_GENERATED',
]);

export const TextRangeInputSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  rangeType: z.string().optional().default('character'),
});

export const CreateAnnotationInputSchema = z.object({
  assetId: z.string().uuid(),
  annotationType: AnnotationType,
  layer: AnnotationLayer.default('PERSONAL'),
  content: z
    .record(z.string(), z.unknown())
    .describe('JSON content of the annotation'),
  spatialData: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Spatial positioning data'),
  textRange: TextRangeInputSchema.optional().describe(
    'Character range for INLINE_COMMENT and SUGGESTION types'
  ),
  parentId: z.string().uuid().optional(),
});

export const UpdateAnnotationInputSchema = z.object({
  content: z.record(z.string(), z.unknown()).optional(),
  spatialData: z.record(z.string(), z.unknown()).optional(),
  isResolved: z.boolean().optional(),
});

export type TextRangeInput = z.infer<typeof TextRangeInputSchema>;
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationInputSchema>;
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationInputSchema>;

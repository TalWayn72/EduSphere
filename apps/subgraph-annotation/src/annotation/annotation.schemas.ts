import { z } from 'zod';

export const AnnotationType = z.enum([
  'TEXT',
  'SKETCH',
  'LINK',
  'BOOKMARK',
  'SPATIAL_COMMENT',
]);

export const AnnotationLayer = z.enum([
  'PERSONAL',
  'SHARED',
  'INSTRUCTOR',
  'AI_GENERATED',
]);

export const CreateAnnotationInputSchema = z.object({
  assetId: z.string().uuid('Asset ID must be a valid UUID'),
  annotationType: AnnotationType,
  layer: AnnotationLayer.default('PERSONAL'),
  content: z.record(z.unknown()).describe('JSON content of the annotation'),
  spatialData: z
    .record(z.unknown())
    .optional()
    .describe('Spatial positioning data'),
  parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
});

export const UpdateAnnotationInputSchema = z.object({
  content: z.record(z.unknown()).optional(),
  spatialData: z.record(z.unknown()).optional(),
  isResolved: z.boolean().optional(),
});

export type CreateAnnotationInput = z.infer<typeof CreateAnnotationInputSchema>;
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationInputSchema>;

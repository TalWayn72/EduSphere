import { z } from 'zod';

const coordinateField = z.number().min(0).max(1).optional();
const pageField = z.number().int().min(1).optional();

export const CreateVisualAnchorSchema = z.object({
  mediaAssetId: z.string().uuid('mediaAssetId must be a valid UUID'),
  courseId: z.string().uuid('courseId must be a valid UUID'),
  anchorText: z.string().min(1, 'anchorText is required').max(5000, 'anchorText too long (max 5000 chars)'),
  pageNumber: pageField,
  posX: coordinateField,
  posY: coordinateField,
  posW: coordinateField,
  posH: coordinateField,
  pageEnd: pageField,
  posXEnd: coordinateField,
  posYEnd: coordinateField,
  documentOrder: z.number().int().min(0, 'documentOrder must be >= 0'),
});

export const UpdateVisualAnchorSchema = z
  .object({
    anchorText: z.string().min(1).max(5000).optional(),
    pageNumber: pageField,
    posX: coordinateField,
    posY: coordinateField,
    posW: coordinateField,
    posH: coordinateField,
    pageEnd: pageField,
    posXEnd: coordinateField,
    posYEnd: coordinateField,
    documentOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' }
  );

export type CreateVisualAnchorDto = z.infer<typeof CreateVisualAnchorSchema>;
export type UpdateVisualAnchorDto = z.infer<typeof UpdateVisualAnchorSchema>;

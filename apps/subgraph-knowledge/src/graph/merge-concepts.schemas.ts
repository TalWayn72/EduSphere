import { z } from 'zod';

export const MergeConceptsInputSchema = z.object({
  sourceConceptId: z
    .string()
    .min(1, 'Source concept ID is required'),
  targetConceptId: z
    .string()
    .min(1, 'Target concept ID is required'),
  keepTarget: z.boolean(),
});

export type MergeConceptsInput = z.infer<typeof MergeConceptsInputSchema>;

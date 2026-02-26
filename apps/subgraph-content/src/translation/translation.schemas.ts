import { z } from 'zod';

export const RequestContentTranslationSchema = z.object({
  contentItemId: z.string().uuid(),
  targetLocale: z.string().min(2).max(10),
});

export type RequestContentTranslationInput = z.infer<
  typeof RequestContentTranslationSchema
>;

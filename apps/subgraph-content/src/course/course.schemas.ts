import { z } from 'zod';

export const CreateCourseInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  slug: z.string().max(200).optional(),
  thumbnailUrl: z.string().url().optional(),
  estimatedHours: z.number().positive().optional(),
  isPublished: z.boolean().optional(),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

export const UpdateCourseInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  slug: z.string().max(200).optional(),
  thumbnailUrl: z.string().url().optional(),
  estimatedHours: z.number().positive().optional(),
});
export type UpdateCourseInput = z.infer<typeof UpdateCourseInputSchema>;

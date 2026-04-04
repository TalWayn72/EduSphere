import { z } from 'zod';

/** Zod schema for the ingestYoutubeLesson mutation input. */
export const IngestYoutubeLessonSchema = z.object({
  lessonId: z.string().uuid('lessonId must be a valid UUID'),
  youtubeUrl: z
    .string()
    .min(1, 'youtubeUrl is required')
    .max(2048, 'youtubeUrl is too long'),
});

/** Zod schema for the updateLessonCitation mutation input. */
export const UpdateCitationSchema = z.object({
  matchStatus: z
    .enum(['VERIFIED', 'UNVERIFIED', 'FAILED'])
    .optional(),
  sourceText: z.string().max(10_000).optional(),
  bookName: z.string().max(500).optional(),
  part: z.string().max(200).optional(),
  page: z.string().max(200).optional(),
  column: z.string().max(200).optional(),
  paragraph: z.string().max(200).optional(),
});

/** Zod schema for the setBlockAnchorTimestamp mutation input. */
export const SetBlockAnchorTimestampSchema = z.object({
  blockId: z.string().uuid('blockId must be a valid UUID'),
  startTime: z.number().min(0, 'startTime must be non-negative'),
  endTime: z.number().min(0, 'endTime must be non-negative').optional(),
});

export type IngestYoutubeLessonInput = z.infer<typeof IngestYoutubeLessonSchema>;
export type UpdateCitationInput = z.infer<typeof UpdateCitationSchema>;
export type SetBlockAnchorTimestampInput = z.infer<typeof SetBlockAnchorTimestampSchema>;

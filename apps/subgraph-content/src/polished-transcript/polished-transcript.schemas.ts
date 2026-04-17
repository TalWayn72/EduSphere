import { z } from 'zod';

export const EditPolishedBlockSchema = z.object({
  blockId: z.string().uuid('blockId must be a valid UUID'),
  content: z
    .string()
    .min(1, 'content is required')
    .max(50_000, 'content is too long'),
});

export const ChangeDecisionSchema = z.object({
  changeId: z.string().uuid('changeId must be a valid UUID'),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
});

export const BulkChangeDecisionSchema = z.object({
  polishedTranscriptId: z
    .string()
    .uuid('polishedTranscriptId must be a valid UUID'),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
});

export type EditPolishedBlockInput = z.infer<typeof EditPolishedBlockSchema>;
export type ChangeDecisionInput = z.infer<typeof ChangeDecisionSchema>;
export type BulkChangeDecisionInput = z.infer<typeof BulkChangeDecisionSchema>;

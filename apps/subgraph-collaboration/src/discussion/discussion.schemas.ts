import { z } from 'zod';

export const discussionTypeSchema = z.enum(['FORUM', 'CHAVRUTA', 'DEBATE']);
export const messageTypeSchema = z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']);

export const createDiscussionInputSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  discussionType: discussionTypeSchema,
});

export const addMessageInputSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(10000, 'Message too long'),
  messageType: messageTypeSchema,
  parentMessageId: z.string().uuid('Invalid parent message ID').optional(),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionInputSchema>;
export type AddMessageInput = z.infer<typeof addMessageInputSchema>;

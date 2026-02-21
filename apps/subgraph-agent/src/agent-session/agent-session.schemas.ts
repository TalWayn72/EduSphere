import { z } from 'zod';

export const TemplateTypeEnum = z.enum([
  'TUTOR',
  'QUIZ_GENERATOR',
  'DEBATE_FACILITATOR',
  'EXPLANATION_GENERATOR',
  'CHAVRUTA_DEBATE',
  'SUMMARIZE',
  'QUIZ_ASSESS',
  'RESEARCH_SCOUT',
  'EXPLAIN',
  'CUSTOM',
]);

export const StartAgentSessionSchema = z.object({
  templateType: TemplateTypeEnum,
  context: z.record(z.string(), z.unknown()).optional(),
  locale: z.string().min(2).max(10).optional().default('en'),
});

export const SendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  locale: z.string().min(2).max(10).optional().default('en'),
});

export const EndSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export type StartAgentSessionInput = z.infer<typeof StartAgentSessionSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type EndSessionInput = z.infer<typeof EndSessionSchema>;

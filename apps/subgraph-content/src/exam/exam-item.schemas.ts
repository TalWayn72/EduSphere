import { z } from 'zod';

export const BloomLevelSchema = z.enum([
  'REMEMBER',
  'UNDERSTAND',
  'APPLY',
  'ANALYZE',
  'EVALUATE',
  'CREATE',
]);

export const CalibrationStatusSchema = z.enum([
  'DRAFT',
  'PILOT',
  'CALIBRATED',
  'RETIRED',
]);

export const ExamItemSourceSchema = z.enum([
  'MANUAL',
  'AI_GENERATED',
  'IMPORTED',
]);

export const createExamItemSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid().optional(),
  domainTag: z.string().min(1).max(100),
  bloomLevel: BloomLevelSchema,
  questionData: z
    .record(z.string(), z.unknown())
    .refine((data) => data && typeof data === 'object', {
      message: 'questionData must be a valid object',
    }),
  source: ExamItemSourceSchema.optional().default('MANUAL'),
});

export const updateExamItemSchema = z.object({
  domainTag: z.string().min(1).max(100).optional(),
  bloomLevel: BloomLevelSchema.optional(),
  questionData: z.record(z.string(), z.unknown()).optional(),
});

export const examItemFilterSchema = z.object({
  courseId: z.string().uuid().optional(),
  domainTag: z.string().optional(),
  bloomLevel: BloomLevelSchema.optional(),
  calibrationStatus: CalibrationStatusSchema.optional(),
  source: ExamItemSourceSchema.optional(),
});

export const generateExamItemsSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid().optional(),
  domainTag: z.string().min(1).max(100),
  bloomLevels: z.array(BloomLevelSchema).min(1),
  count: z.number().int().min(1).max(50),
  targetDifficulty: z.number().min(0).max(1).optional(),
});

export const submitExamAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  itemId: z.string().uuid(),
  answer: z
    .record(z.string(), z.unknown())
    .refine((data) => data && typeof data === 'object', {
      message: 'answer must be a valid object',
    }),
});

export type CreateExamItemInput = z.infer<typeof createExamItemSchema>;
export type UpdateExamItemInput = z.infer<typeof updateExamItemSchema>;
export type ExamItemFilter = z.infer<typeof examItemFilterSchema>;
export type GenerateExamItemsInput = z.infer<typeof generateExamItemsSchema>;
export type SubmitExamAnswerInput = z.infer<typeof submitExamAnswerSchema>;

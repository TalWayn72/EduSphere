/**
 * Zod validation schemas for branching scenario mutations (F-009).
 */
import { z } from 'zod';

export const scenarioChoiceItemSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().min(1).max(500),
  nextContentItemId: z.string().uuid().nullable(),
});

export const scenarioContentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  choices: z.array(scenarioChoiceItemSchema).max(8),
  isEndNode: z.boolean(),
  endingType: z.enum(['SUCCESS', 'FAILURE', 'NEUTRAL']).optional(),
});

export const recordScenarioChoiceInputSchema = z.object({
  fromContentItemId: z.string().uuid(),
  choiceId: z.string().min(1),
  scenarioRootId: z.string().uuid(),
});

export type ScenarioContentInput = z.infer<typeof scenarioContentSchema>;
export type RecordScenarioChoiceInput = z.infer<typeof recordScenarioChoiceInputSchema>;

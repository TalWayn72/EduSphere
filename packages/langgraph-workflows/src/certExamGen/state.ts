/**
 * Certification Exam Generator — LangGraph state annotation.
 */
import { Annotation } from '@langchain/langgraph';
import type { GeneratedItem } from './types';

export const CertExamGenAnnotation = Annotation.Root({
  // Inputs
  moduleId: Annotation<string>(),
  courseContent: Annotation<string>({ value: (_, u) => u, default: () => '' }),
  knowledgeGraphConcepts: Annotation<string[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  targetBloomLevels: Annotation<string[]>({
    value: (_, u) => u,
    default: () => ['UNDERSTAND'],
  }),
  targetCount: Annotation<number>({ value: (_, u) => u, default: () => 10 }),
  targetDifficulty: Annotation<string>({
    value: (_, u) => u,
    default: () => 'medium',
  }),
  locale: Annotation<string>({ value: (_, u) => u, default: () => 'en' }),

  // Pipeline state
  generatedItems: Annotation<GeneratedItem[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  bloomValidated: Annotation<GeneratedItem[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  iwfChecked: Annotation<GeneratedItem[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  distractorEnhanced: Annotation<GeneratedItem[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  finalItems: Annotation<GeneratedItem[]>({
    value: (_, u) => u,
    default: () => [],
  }),

  // Control
  retryCount: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  errors: Annotation<string[]>({ value: (_, u) => u, default: () => [] }),
});

export type CertExamGenState = typeof CertExamGenAnnotation.State;

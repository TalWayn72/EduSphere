/**
 * LangGraph adapter for Certification Exam Generator workflow.
 *
 * Follows the exact pattern from ai.langgraph.ts:
 * - Accepts optional checkpointer for durable state
 * - Falls back to MemorySaver for tests
 * - Thread config for session tracking
 */
import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import type { LanguageModel } from 'ai';
import {
  createCertExamGeneratorWorkflow,
  type GeneratedItem,
  type CitationSearchFn,
} from '@edusphere/langgraph-workflows';

type Checkpointer = MemorySaver | PostgresSaver;

function threadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

export interface CertExamGenResult {
  items: GeneratedItem[];
  errors: string[];
}

export async function runCertExamGenerator(
  threadId: string,
  moduleId: string,
  targetBloomLevels: string[],
  targetCount: number,
  targetDifficulty: string,
  locale: string,
  model: LanguageModel,
  checkpointer?: Checkpointer,
  searchFn?: CitationSearchFn
): Promise<CertExamGenResult> {
  const _cp = checkpointer ?? new MemorySaver();
  const compiled = createCertExamGeneratorWorkflow(model, searchFn);

  const state = {
    moduleId,
    targetBloomLevels,
    targetCount,
    targetDifficulty,
    locale,
    courseContent: '',
    knowledgeGraphConcepts: [],
    generatedItems: [],
    bloomValidated: [],
    iwfChecked: [],
    distractorEnhanced: [],
    finalItems: [],
    retryCount: 0,
    errors: [],
  };

  const result = await compiled.invoke(state, threadConfig(threadId));
  const typedResult = result as Record<string, unknown>;

  return {
    items: (typedResult['finalItems'] as GeneratedItem[]) ?? [],
    errors: (typedResult['errors'] as string[]) ?? [],
  };
}

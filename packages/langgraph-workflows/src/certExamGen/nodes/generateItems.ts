/**
 * Node 2: generateItems — LLM-based item generation (temperature 0.9).
 *
 * Uses PS4 prompting: system persona, Bloom verbs, 2 exemplars, chain-of-thought.
 * Over-generates by 1.5x to allow filtering in subsequent nodes.
 */
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import { injectLocale } from '../../locale-prompt';
import type { CertExamGenState } from '../state';
import type { GeneratedItem } from '../types';

const BLOOM_VERBS: Record<string, string> = {
  REMEMBER: 'define, list, recall, identify, recognize, name',
  UNDERSTAND: 'explain, describe, summarize, classify, interpret, compare',
  APPLY: 'solve, demonstrate, implement, use, execute, calculate',
  ANALYZE: 'compare, contrast, differentiate, examine, deconstruct, organize',
  EVALUATE: 'justify, assess, critique, defend, judge, prioritize',
  CREATE: 'design, construct, develop, formulate, propose, synthesize',
};

const OVERGENERATE_FACTOR = 1.5;

const ItemArraySchema = z.object({
  items: z.array(
    z.object({
      question: z.string(),
      options: z
        .array(
          z.object({
            text: z.string(),
            isCorrect: z.boolean(),
            explanation: z.string().optional(),
          })
        )
        .length(4),
      bloomLevel: z.string(),
      domainTag: z.string(),
      difficulty: z.string(),
    })
  ),
});

function buildSystemPrompt(bloomLevels: string[], locale: string): string {
  const verbBlock = bloomLevels
    .map((lvl) => `  ${lvl}: ${BLOOM_VERBS[lvl] ?? 'N/A'}`)
    .join('\n');

  const base = `You are an expert certification exam item writer following IRT best practices.

Bloom's Taxonomy cognitive levels and required verbs:
${verbBlock}

Rules:
- Each question MUST have exactly 4 options: 1 correct, 3 plausible distractors
- All option texts must be similar in length (within 1.5x of each other)
- Never use "All of the above" or "None of the above"
- Avoid absolute terms ("always", "never") in distractors only
- The correct answer must NOT be significantly longer than distractors
- Stem must be clear, concise, and test a single concept

Chain-of-thought: First identify key concepts, then determine common misconceptions, then construct plausible distractors that exploit those misconceptions.`;

  return injectLocale(base, locale);
}

function buildUserPrompt(state: CertExamGenState, count: number): string {
  const concepts =
    state.knowledgeGraphConcepts.length > 0
      ? `\nKey concepts: ${state.knowledgeGraphConcepts.slice(0, 15).join(', ')}`
      : '';

  return `Generate ${count} certification exam questions.

Content context:
${state.courseContent.slice(0, 3000)}
${concepts}

Target Bloom levels: ${state.targetBloomLevels.join(', ')}
Target difficulty: ${state.targetDifficulty}
Domain: module ${state.moduleId}

For each item provide: question, 4 options (exactly 1 correct), bloomLevel, domainTag, difficulty.`;
}

export function generateItemsNode(model: LanguageModel) {
  return async (
    state: CertExamGenState
  ): Promise<Partial<CertExamGenState>> => {
    const requestCount = Math.ceil(state.targetCount * OVERGENERATE_FACTOR);
    const systemPrompt = buildSystemPrompt(
      state.targetBloomLevels,
      state.locale
    );
    const userPrompt = buildUserPrompt(state, requestCount);

    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]['model'],
      system: systemPrompt,
      schema: ItemArraySchema,
      prompt: userPrompt,
      temperature: 0.9,
    });

    const items: GeneratedItem[] = object.items.map((item) => ({
      ...item,
      iwfFlags: [],
      verified: false,
    }));

    return { generatedItems: items };
  };
}

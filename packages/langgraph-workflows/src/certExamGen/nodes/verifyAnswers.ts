/**
 * Node 6: verifyAnswers — independent answer verification (temperature 0.0).
 *
 * Asks the LLM to independently identify the correct answer for each question.
 * Items where generation and verification agree are marked verified: true.
 */
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import type { CertExamGenState } from '../state';
import type { GeneratedItem } from '../types';

const VerificationSchema = z.object({
  verifications: z.array(
    z.object({
      index: z.number(),
      correctOptionIndex: z.number().min(0).max(3),
    })
  ),
});

export function verifyAnswersNode(model: LanguageModel) {
  return async (
    state: CertExamGenState
  ): Promise<Partial<CertExamGenState>> => {
    const items = state.distractorEnhanced;
    if (items.length === 0) return { finalItems: [] };

    const questionsBlock = items
      .map((item, i) => {
        const optionsStr = item.options
          .map((o, j) => `  ${j}) ${o.text}`)
          .join('\n');
        return `[${i}] ${item.question}\n${optionsStr}`;
      })
      .join('\n\n');

    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]['model'],
      system:
        'You are a subject matter expert. For each multiple-choice question, identify which option (0-3) is the correct answer. Be precise and analytical.',
      schema: VerificationSchema,
      prompt: `For each question, identify the correct answer index (0-3):\n\n${questionsBlock}`,
      temperature: 0,
    });

    const verifyMap = new Map(
      object.verifications.map((v) => [v.index, v.correctOptionIndex])
    );

    const verified: GeneratedItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const llmChoice = verifyMap.get(i);
      const markedCorrectIdx = item.options.findIndex((o) => o.isCorrect);

      if (llmChoice === markedCorrectIdx) {
        verified.push({ ...item, verified: true });
      } else {
        verified.push({ ...item, verified: false });
      }
    }

    return { finalItems: verified.filter((item) => item.verified) };
  };
}

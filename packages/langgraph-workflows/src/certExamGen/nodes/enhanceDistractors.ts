/**
 * Node 5: enhanceDistractors — LLM-based distractor improvement (temperature 0.7).
 *
 * For items with 1 IWF flag or weak distractors, generates replacement candidates.
 * Items already passing all checks are skipped.
 */
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import type { CertExamGenState } from '../state';
import type { GeneratedItem } from '../types';

const EnhancedDistractorsSchema = z.object({
  distractors: z.array(
    z.object({
      text: z.string(),
      plausibilityRank: z.number(),
    })
  ),
});

async function enhanceSingleItem(
  item: GeneratedItem,
  model: LanguageModel
): Promise<GeneratedItem> {
  const correct = item.options.find((o) => o.isCorrect);
  if (!correct) return item;

  const { object } = await generateObject({
    model: model as Parameters<typeof generateObject>[0]['model'],
    system:
      'You are an expert distractor writer for certification exams. Generate plausible but incorrect answer options that exploit common misconceptions.',
    schema: EnhancedDistractorsSchema,
    prompt: `Question: ${item.question}
Correct answer: ${correct.text}
Bloom level: ${item.bloomLevel}
IWF issues: ${item.iwfFlags.join(', ')}

Generate 6 plausible distractors ranked by plausibility (1=most plausible).
Each distractor must be similar in length to the correct answer (${correct.text.length} chars ±30%).`,
    temperature: 0.7,
  });

  const ranked = object.distractors
    .sort((a, b) => a.plausibilityRank - b.plausibilityRank)
    .slice(0, 3);

  const newOptions = [
    correct,
    ...ranked.map((d) => ({ text: d.text, isCorrect: false as const })),
  ];

  return { ...item, options: newOptions, iwfFlags: [] };
}

export function enhanceDistractorsNode(model: LanguageModel) {
  return async (state: CertExamGenState): Promise<Partial<CertExamGenState>> => {
    const results: GeneratedItem[] = [];

    for (const item of state.iwfChecked) {
      if (item.iwfFlags.length === 0) {
        results.push(item);
        continue;
      }
      try {
        const enhanced = await enhanceSingleItem(item, model);
        results.push(enhanced);
      } catch {
        // Keep original item if enhancement fails
        results.push(item);
      }
    }

    return { distractorEnhanced: results };
  };
}

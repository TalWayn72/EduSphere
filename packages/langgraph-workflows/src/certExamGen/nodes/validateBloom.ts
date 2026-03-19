/**
 * Node 3: validateBloom — independent Bloom's taxonomy classifier (temperature 0.0).
 *
 * Uses a second LLM pass to classify each item's actual Bloom level.
 * Rejects items where classified level differs from target by > 1 level.
 */
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import type { CertExamGenState } from '../state';
import type { GeneratedItem } from '../types';

const BLOOM_ORDER = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];

const ClassificationSchema = z.object({
  classifications: z.array(
    z.object({
      index: z.number(),
      classifiedLevel: z.string(),
    })
  ),
});

function bloomDistance(a: string, b: string): number {
  const idxA = BLOOM_ORDER.indexOf(a.toUpperCase());
  const idxB = BLOOM_ORDER.indexOf(b.toUpperCase());
  if (idxA === -1 || idxB === -1) return 0;
  return Math.abs(idxA - idxB);
}

export function validateBloomNode(model: LanguageModel) {
  return async (state: CertExamGenState): Promise<Partial<CertExamGenState>> => {
    const items = state.generatedItems;
    if (items.length === 0) return { bloomValidated: [] };

    const questionsBlock = items
      .map((item, i) => `[${i}] ${item.question}`)
      .join('\n');

    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]['model'],
      system:
        'You are a Bloom\'s taxonomy classifier. For each question, determine which cognitive level it assesses: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, or CREATE. Be precise.',
      schema: ClassificationSchema,
      prompt: `Classify each question by Bloom's taxonomy level:\n\n${questionsBlock}`,
      temperature: 0,
    });

    const classMap = new Map(
      object.classifications.map((c) => [c.index, c.classifiedLevel.toUpperCase()])
    );

    const validated: GeneratedItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const classified = classMap.get(i) ?? items[i]!.bloomLevel;
      const target = items[i]!.bloomLevel;
      if (bloomDistance(classified, target) <= 1) {
        validated.push({ ...items[i]!, bloomLevel: classified });
      }
    }

    return { bloomValidated: validated };
  };
}

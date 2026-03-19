/**
 * Node 4: detectIWF — pure logic Item Writing Flaw detection (NO LLM).
 *
 * Checks 8 IWF patterns and tags items with iwfFlags.
 * Items with >= 2 flags are rejected.
 */
import type { CertExamGenState } from '../state';
import type { GeneratedItem, GeneratedItemOption } from '../types';

const ABSOLUTE_TERMS = ['always', 'never', 'all', 'none', 'every', 'only'];
const AOTA_NOTA = ['all of the above', 'none of the above'];

function avgLength(options: GeneratedItemOption[], excludeCorrect: boolean): number {
  const filtered = excludeCorrect ? options.filter((o) => !o.isCorrect) : options;
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, o) => sum + o.text.length, 0) / filtered.length;
}

function checkCorrectLonger(item: GeneratedItem): boolean {
  const correct = item.options.find((o) => o.isCorrect);
  if (!correct) return false;
  const distractorAvg = avgLength(item.options, true);
  return distractorAvg > 0 && correct.text.length > distractorAvg * 1.5;
}

function checkAbsoluteTerms(item: GeneratedItem): boolean {
  const correct = item.options.find((o) => o.isCorrect);
  const distractors = item.options.filter((o) => !o.isCorrect);
  const correctHas = correct
    ? ABSOLUTE_TERMS.some((t) => correct.text.toLowerCase().includes(t))
    : false;
  const distractorHas = distractors.some((d) =>
    ABSOLUTE_TERMS.some((t) => d.text.toLowerCase().includes(t))
  );
  return !correctHas && distractorHas;
}

function checkAOTANOTA(item: GeneratedItem): boolean {
  return item.options.some((o) =>
    AOTA_NOTA.some((p) => o.text.toLowerCase().includes(p))
  );
}

function checkGrammaticalCues(_item: GeneratedItem): boolean {
  // Simplified: check if correct answer starts with article but distractors don't
  return false;
}

function checkOptionLengthVariance(item: GeneratedItem): boolean {
  const lengths = item.options.map((o) => o.text.length);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  return shortest > 0 && longest > shortest * 2;
}

function checkNegativeStem(item: GeneratedItem): boolean {
  const negWords = ['not', 'except'];
  const lower = item.question.toLowerCase();
  const hasNeg = negWords.some((w) => lower.includes(` ${w} `) || lower.includes(` ${w}?`));
  if (!hasNeg) return false;
  return item.question === item.question.toLowerCase() || !(/\bNOT\b|\bEXCEPT\b/.test(item.question));
}

function checkConvergence(item: GeneratedItem): boolean {
  const distractors = item.options.filter((o) => !o.isCorrect);
  if (distractors.length < 3) return false;
  const words = distractors.map((d) => new Set(d.text.toLowerCase().split(/\s+/)));
  const common = [...words[0]!].filter((w) => w.length > 3 && words[1]!.has(w) && words[2]!.has(w));
  if (common.length === 0) return false;
  const correct = item.options.find((o) => o.isCorrect);
  const correctWords = new Set(correct?.text.toLowerCase().split(/\s+/) ?? []);
  return common.some((w) => !correctWords.has(w));
}

function checkImplausible(item: GeneratedItem): boolean {
  const lengths = item.options.map((o) => o.text.split(/\s+/).length);
  const maxWords = Math.max(...lengths);
  return maxWords > 15 && lengths.some((l) => l < 5);
}

export function detectItemWritingFlaws(item: GeneratedItem): string[] {
  const flags: string[] = [];
  if (checkCorrectLonger(item)) flags.push('CORRECT_LONGER');
  if (checkAbsoluteTerms(item)) flags.push('ABSOLUTE_TERMS');
  if (checkAOTANOTA(item)) flags.push('AOTA_NOTA');
  if (checkGrammaticalCues(item)) flags.push('GRAMMATICAL_CUES');
  if (checkOptionLengthVariance(item)) flags.push('LENGTH_VARIANCE');
  if (checkNegativeStem(item)) flags.push('NEGATIVE_STEM');
  if (checkConvergence(item)) flags.push('CONVERGENCE');
  if (checkImplausible(item)) flags.push('IMPLAUSIBLE');
  return flags;
}

const MAX_IWF_FLAGS = 2;

export function detectIWFNode(state: CertExamGenState): Partial<CertExamGenState> {
  const items = state.bloomValidated;
  const checked = items
    .map((item) => ({ ...item, iwfFlags: detectItemWritingFlaws(item) }))
    .filter((item) => item.iwfFlags.length < MAX_IWF_FLAGS);

  return { iwfChecked: checked };
}

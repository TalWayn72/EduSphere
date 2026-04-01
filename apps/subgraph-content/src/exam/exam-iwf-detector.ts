/**
 * Item Writing Flaw (IWF) detector — pure functions, no class needed.
 *
 * Checks 8 common IWF patterns in multiple-choice exam items.
 * Can be used independently from the LangGraph pipeline for
 * server-side validation of manually created items.
 */

interface ExamOption {
  text: string;
  isCorrect: boolean;
}

interface ExamItem {
  question: string;
  options: ExamOption[];
}

const ABSOLUTE_TERMS = ['always', 'never', 'all', 'none', 'every', 'only'];
const AOTA_NOTA = ['all of the above', 'none of the above'];

function avgOptionLength(
  options: ExamOption[],
  excludeCorrect: boolean
): number {
  const filtered = excludeCorrect
    ? options.filter((o) => !o.isCorrect)
    : options;
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, o) => sum + o.text.length, 0) / filtered.length;
}

/** IWF-1: Correct answer significantly longer than distractors (>1.5x avg) */
export function checkCorrectAnswerLonger(item: ExamItem): boolean {
  const correct = item.options.find((o) => o.isCorrect);
  if (!correct) return false;
  const distractorAvg = avgOptionLength(item.options, true);
  return distractorAvg > 0 && correct.text.length > distractorAvg * 1.5;
}

/** IWF-2: Absolute terms appear only in distractors */
export function checkAbsoluteTermsInDistractors(item: ExamItem): boolean {
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

/** IWF-3: "All of the above" or "None of the above" patterns */
export function checkAotaNota(item: ExamItem): boolean {
  return item.options.some((o) =>
    AOTA_NOTA.some((p) => o.text.toLowerCase().includes(p))
  );
}

/** IWF-4: Grammatical cues (simplified check) */
export function checkGrammaticalCues(_item: ExamItem): boolean {
  return false; // Full implementation requires NLP; placeholder for future
}

/** IWF-5: Option length variance > 2x between shortest and longest */
export function checkOptionLengthVariance(item: ExamItem): boolean {
  const lengths = item.options.map((o) => o.text.length);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  return shortest > 0 && longest > shortest * 2;
}

/** IWF-6: Negative stem without uppercase emphasis */
export function checkNegativeStemNoEmphasis(item: ExamItem): boolean {
  const lower = item.question.toLowerCase();
  const hasNeg = [' not ', ' except '].some(
    (w) => lower.includes(w) || lower.endsWith(w.trimEnd())
  );
  if (!hasNeg) return false;
  return !/\bNOT\b|\bEXCEPT\b/.test(item.question);
}

/** IWF-7: Convergence — 3 distractors share element, correct is outlier */
export function checkConvergence(item: ExamItem): boolean {
  const distractors = item.options.filter((o) => !o.isCorrect);
  if (distractors.length < 3) return false;
  const wordSets = distractors.map(
    (d) => new Set(d.text.toLowerCase().split(/\s+/))
  );
  const common = [...wordSets[0]!].filter(
    (w) => w.length > 3 && wordSets[1]!.has(w) && wordSets[2]!.has(w)
  );
  if (common.length === 0) return false;
  const correct = item.options.find((o) => o.isCorrect);
  const correctWords = new Set(correct?.text.toLowerCase().split(/\s+/) ?? []);
  return common.some((w) => !correctWords.has(w));
}

/** IWF-8: Implausible distractor (too short when others are long) */
export function checkImplausibleDistractor(item: ExamItem): boolean {
  const wordCounts = item.options.map((o) => o.text.split(/\s+/).length);
  const maxWords = Math.max(...wordCounts);
  return maxWords > 15 && wordCounts.some((c) => c < 5);
}

/**
 * Run all 8 IWF checks and return an array of flag names.
 * Empty array = no flaws detected.
 */
export function detectItemWritingFlaws(item: ExamItem): string[] {
  const flags: string[] = [];
  if (checkCorrectAnswerLonger(item)) flags.push('CORRECT_LONGER');
  if (checkAbsoluteTermsInDistractors(item)) flags.push('ABSOLUTE_TERMS');
  if (checkAotaNota(item)) flags.push('AOTA_NOTA');
  if (checkGrammaticalCues(item)) flags.push('GRAMMATICAL_CUES');
  if (checkOptionLengthVariance(item)) flags.push('LENGTH_VARIANCE');
  if (checkNegativeStemNoEmphasis(item)) flags.push('NEGATIVE_STEM');
  if (checkConvergence(item)) flags.push('CONVERGENCE');
  if (checkImplausibleDistractor(item)) flags.push('IMPLAUSIBLE');
  return flags;
}

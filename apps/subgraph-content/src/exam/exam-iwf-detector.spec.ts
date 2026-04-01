import { describe, it, expect } from 'vitest';
import {
  checkCorrectAnswerLonger,
  checkAbsoluteTermsInDistractors,
  checkAotaNota,
  checkOptionLengthVariance,
  checkNegativeStemNoEmphasis,
  checkConvergence,
  checkImplausibleDistractor,
  detectItemWritingFlaws,
} from './exam-iwf-detector';

const mkItem = (
  question: string,
  options: Array<{ text: string; isCorrect: boolean }>
) => ({ question, options });

describe('IWF Detector', () => {
  describe('checkCorrectAnswerLonger', () => {
    it('flags when correct answer is >1.5x average distractor length', () => {
      const item = mkItem('What is photosynthesis?', [
        {
          text: 'The process by which green plants convert sunlight into chemical energy using chlorophyll',
          isCorrect: true,
        },
        { text: 'Cell division', isCorrect: false },
        { text: 'Respiration', isCorrect: false },
        { text: 'Osmosis', isCorrect: false },
      ]);
      expect(checkCorrectAnswerLonger(item)).toBe(true);
    });

    it('does not flag when options are similar length', () => {
      const item = mkItem('Capital of France?', [
        { text: 'Paris', isCorrect: true },
        { text: 'London', isCorrect: false },
        { text: 'Berlin', isCorrect: false },
        { text: 'Madrid', isCorrect: false },
      ]);
      expect(checkCorrectAnswerLonger(item)).toBe(false);
    });
  });

  describe('checkAbsoluteTermsInDistractors', () => {
    it('flags when distractors contain absolute terms but correct does not', () => {
      const item = mkItem('Which statement is true?', [
        { text: 'Most mammals are warm-blooded', isCorrect: true },
        { text: 'All reptiles are always cold-blooded', isCorrect: false },
        { text: 'Fish never breathe air', isCorrect: false },
        { text: 'Every bird can fly', isCorrect: false },
      ]);
      expect(checkAbsoluteTermsInDistractors(item)).toBe(true);
    });

    it('does not flag when correct also has absolute terms', () => {
      const item = mkItem('Which is true?', [
        { text: 'All mammals are warm-blooded', isCorrect: true },
        { text: 'All reptiles are cold-blooded', isCorrect: false },
      ]);
      expect(checkAbsoluteTermsInDistractors(item)).toBe(false);
    });
  });

  describe('checkAotaNota', () => {
    it('detects "all of the above"', () => {
      const item = mkItem('Which are primary colors?', [
        { text: 'Red', isCorrect: false },
        { text: 'Blue', isCorrect: false },
        { text: 'All of the above', isCorrect: true },
      ]);
      expect(checkAotaNota(item)).toBe(true);
    });

    it('detects "none of the above"', () => {
      const item = mkItem('Which is largest?', [
        { text: 'Earth', isCorrect: false },
        { text: 'Mars', isCorrect: false },
        { text: 'None of the above', isCorrect: true },
      ]);
      expect(checkAotaNota(item)).toBe(true);
    });

    it('returns false for clean options', () => {
      const item = mkItem('Capital of Japan?', [
        { text: 'Tokyo', isCorrect: true },
        { text: 'Osaka', isCorrect: false },
        { text: 'Kyoto', isCorrect: false },
      ]);
      expect(checkAotaNota(item)).toBe(false);
    });
  });

  describe('checkOptionLengthVariance', () => {
    it('flags when longest option is >2x shortest', () => {
      const item = mkItem('Describe DNA', [
        { text: 'Yes', isCorrect: false },
        {
          text: 'Deoxyribonucleic acid is a molecule that carries genetic instructions',
          isCorrect: true,
        },
        { text: 'A type of protein found in cells', isCorrect: false },
      ]);
      expect(checkOptionLengthVariance(item)).toBe(true);
    });

    it('does not flag when options are similar length', () => {
      const item = mkItem('Q?', [
        { text: 'Option Alpha', isCorrect: true },
        { text: 'Option Bravo', isCorrect: false },
        { text: 'Option Delta', isCorrect: false },
      ]);
      expect(checkOptionLengthVariance(item)).toBe(false);
    });
  });

  describe('checkNegativeStemNoEmphasis', () => {
    it('flags negative stem without uppercase emphasis', () => {
      const item = mkItem('Which of the following is not a mammal?', [
        { text: 'Dog', isCorrect: false },
        { text: 'Snake', isCorrect: true },
      ]);
      expect(checkNegativeStemNoEmphasis(item)).toBe(true);
    });

    it('does not flag when NOT is uppercase', () => {
      const item = mkItem('Which of the following is NOT a mammal?', [
        { text: 'Dog', isCorrect: false },
        { text: 'Snake', isCorrect: true },
      ]);
      expect(checkNegativeStemNoEmphasis(item)).toBe(false);
    });

    it('does not flag stems without negative words', () => {
      const item = mkItem('Which is a mammal?', [
        { text: 'Dog', isCorrect: true },
        { text: 'Snake', isCorrect: false },
      ]);
      expect(checkNegativeStemNoEmphasis(item)).toBe(false);
    });
  });

  describe('checkConvergence', () => {
    it('flags when distractors share a word the correct answer lacks', () => {
      const item = mkItem('What powers the sun?', [
        { text: 'Nuclear fusion reactions', isCorrect: true },
        { text: 'Chemical combustion process', isCorrect: false },
        { text: 'Electrical combustion reaction', isCorrect: false },
        { text: 'Thermal combustion energy', isCorrect: false },
      ]);
      expect(checkConvergence(item)).toBe(true);
    });
  });

  describe('checkImplausibleDistractor', () => {
    it('flags very short distractor among long ones', () => {
      const long =
        'This is a detailed and thorough explanation that contains many words about a very specific and complex topic area in advanced science education and research methodology';
      const item = mkItem('Explain evolution', [
        { text: long, isCorrect: true },
        { text: long, isCorrect: false },
        { text: long, isCorrect: false },
        { text: 'Yes', isCorrect: false },
      ]);
      expect(checkImplausibleDistractor(item)).toBe(true);
    });
  });

  describe('detectItemWritingFlaws', () => {
    it('returns empty array for well-written item', () => {
      const item = mkItem('What is the capital of France?', [
        { text: 'Paris', isCorrect: true },
        { text: 'London', isCorrect: false },
        { text: 'Berlin', isCorrect: false },
        { text: 'Madrid', isCorrect: false },
      ]);
      expect(detectItemWritingFlaws(item)).toEqual([]);
    });

    it('returns multiple flags for poorly written item', () => {
      const item = mkItem('Which of the following is not correct?', [
        {
          text: 'The process by which green plants convert sunlight energy into food using chlorophyll molecules',
          isCorrect: true,
        },
        { text: 'Always true', isCorrect: false },
        { text: 'Never', isCorrect: false },
        { text: 'None of the above', isCorrect: false },
      ]);
      const flags = detectItemWritingFlaws(item);
      expect(flags.length).toBeGreaterThan(0);
      expect(flags).toContain('AOTA_NOTA');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { gradeExamItem } from './exam-item-grader';

describe('gradeExamItem', () => {
  describe('MULTIPLE_CHOICE', () => {
    it('correct single answer scores true', () => {
      const qd = { type: 'MULTIPLE_CHOICE', correctOptionIds: ['opt-b'] };
      expect(gradeExamItem(qd, ['opt-b'])).toBe(true);
    });

    it('incorrect answer scores false', () => {
      const qd = { type: 'MULTIPLE_CHOICE', correctOptionIds: ['opt-b'] };
      expect(gradeExamItem(qd, ['opt-a'])).toBe(false);
    });

    it('multiple correct options all selected scores true', () => {
      const qd = { type: 'MULTIPLE_CHOICE', correctOptionIds: ['opt-a', 'opt-c'] };
      expect(gradeExamItem(qd, ['opt-c', 'opt-a'])).toBe(true);
    });

    it('partial selection of multi-correct scores false', () => {
      const qd = { type: 'MULTIPLE_CHOICE', correctOptionIds: ['opt-a', 'opt-c'] };
      expect(gradeExamItem(qd, ['opt-a'])).toBe(false);
    });

    it('non-array answer is wrapped and compared', () => {
      const qd = { type: 'MULTIPLE_CHOICE', correctOptionIds: ['opt-b'] };
      expect(gradeExamItem(qd, 'opt-b')).toBe(true);
    });
  });

  describe('DRAG_ORDER', () => {
    it('correct order scores true', () => {
      const qd = { type: 'DRAG_ORDER', correctOrder: ['step-1', 'step-2', 'step-3'] };
      expect(gradeExamItem(qd, ['step-1', 'step-2', 'step-3'])).toBe(true);
    });

    it('wrong order scores false', () => {
      const qd = { type: 'DRAG_ORDER', correctOrder: ['step-1', 'step-2', 'step-3'] };
      expect(gradeExamItem(qd, ['step-3', 'step-1', 'step-2'])).toBe(false);
    });

    it('non-array answer scores false', () => {
      const qd = { type: 'DRAG_ORDER', correctOrder: ['step-1'] };
      expect(gradeExamItem(qd, 'step-1')).toBe(false);
    });
  });

  describe('HOTSPOT', () => {
    it('selecting correct hotspots scores true', () => {
      const qd = { type: 'HOTSPOT', correctHotspotIds: ['hs-1', 'hs-2'] };
      expect(gradeExamItem(qd, ['hs-1'])).toBe(true);
    });

    it('selecting wrong hotspot scores false', () => {
      const qd = { type: 'HOTSPOT', correctHotspotIds: ['hs-1'] };
      expect(gradeExamItem(qd, ['hs-99'])).toBe(false);
    });

    it('empty selection scores false', () => {
      const qd = { type: 'HOTSPOT', correctHotspotIds: ['hs-1'] };
      expect(gradeExamItem(qd, [])).toBe(false);
    });
  });

  describe('MATCHING', () => {
    it('all correct pairs scores true', () => {
      const qd = {
        type: 'MATCHING',
        correctPairs: [
          { leftId: 'l1', rightId: 'r1' },
          { leftId: 'l2', rightId: 'r2' },
        ],
      };
      const answer = [
        { leftId: 'l1', rightId: 'r1' },
        { leftId: 'l2', rightId: 'r2' },
      ];
      expect(gradeExamItem(qd, answer)).toBe(true);
    });

    it('missing pair scores false', () => {
      const qd = {
        type: 'MATCHING',
        correctPairs: [
          { leftId: 'l1', rightId: 'r1' },
          { leftId: 'l2', rightId: 'r2' },
        ],
      };
      expect(gradeExamItem(qd, [{ leftId: 'l1', rightId: 'r1' }])).toBe(false);
    });

    it('non-array answer scores false', () => {
      const qd = { type: 'MATCHING', correctPairs: [{ leftId: 'l1', rightId: 'r1' }] };
      expect(gradeExamItem(qd, 'wrong')).toBe(false);
    });
  });

  describe('FILL_BLANK', () => {
    it('exact match (case-insensitive) scores true', () => {
      const qd = { type: 'FILL_BLANK', correctAnswer: 'Mitochondria' };
      expect(gradeExamItem(qd, 'mitochondria')).toBe(true);
    });

    it('wrong answer scores false', () => {
      const qd = { type: 'FILL_BLANK', correctAnswer: 'Mitochondria' };
      expect(gradeExamItem(qd, 'nucleus')).toBe(false);
    });

    it('whitespace-trimmed match scores true', () => {
      const qd = { type: 'FILL_BLANK', correctAnswer: 'Paris' };
      expect(gradeExamItem(qd, '  paris  ')).toBe(true);
    });

    it('empty correct answer scores false', () => {
      const qd = { type: 'FILL_BLANK', correctAnswer: '' };
      expect(gradeExamItem(qd, '')).toBe(false);
    });
  });

  describe('unknown type', () => {
    it('returns false for unrecognized question type', () => {
      const qd = { type: 'ESSAY', correctAnswer: 'anything' };
      expect(gradeExamItem(qd, 'anything')).toBe(false);
    });

    it('returns false when type is undefined', () => {
      expect(gradeExamItem({}, 'answer')).toBe(false);
    });
  });
});

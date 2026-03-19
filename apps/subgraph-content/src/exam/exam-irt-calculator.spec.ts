import { describe, it, expect } from 'vitest';
import { ExamIrtCalculator } from './exam-irt-calculator';

function makeItem(id: string, a: number, b: number, c: number) {
  return {
    id,
    irtA: a,
    irtB: b,
    irtC: c,
    calibrationStatus: 'CALIBRATED' as const,
    tenantId: 't1',
    courseId: 'c1',
    domainTag: 'math',
    bloomLevel: 'APPLY',
    questionData: {},
    source: 'MANUAL',
    difFlagged: false,
    exposureCount: 0,
    createdBy: 'u1',
    moduleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('ExamIrtCalculator', () => {
  describe('probability', () => {
    it('returns ~0.5 when theta equals b for a=1, c=0', () => {
      const p = ExamIrtCalculator.probability(0, 1, 0, 0);
      expect(p).toBeCloseTo(0.5, 1);
    });

    it('returns value close to c when theta << b', () => {
      const p = ExamIrtCalculator.probability(-4, 1, 2, 0.2);
      expect(p).toBeCloseTo(0.2, 1);
    });

    it('approaches 1 when theta >> b', () => {
      const p = ExamIrtCalculator.probability(4, 1, -2, 0);
      expect(p).toBeGreaterThan(0.99);
    });
  });

  describe('calculateTheta', () => {
    it('returns null when fewer than 3 calibrated items', () => {
      const items = new Map([
        ['i1', makeItem('i1', 1, 0, 0.2)],
        ['i2', makeItem('i2', 1, 0, 0.2)],
      ]);
      const responses = [
        { itemId: 'i1', correct: true },
        { itemId: 'i2', correct: false },
      ];
      expect(ExamIrtCalculator.calculateTheta(responses, items)).toBeNull();
    });

    it('returns theta near 0 for 50% correct on medium-difficulty items', () => {
      const items = new Map<string, ReturnType<typeof makeItem>>();
      const responses: Array<{ itemId: string; correct: boolean }> = [];
      for (let i = 0; i < 20; i++) {
        const id = `item-${i}`;
        items.set(id, makeItem(id, 1, 0, 0));
        responses.push({ itemId: id, correct: i % 2 === 0 });
      }
      const result = ExamIrtCalculator.calculateTheta(responses, items);
      expect(result).not.toBeNull();
      expect(result!.theta).toBeCloseTo(0, 0);
    });

    it('returns positive theta for high performance', () => {
      const items = new Map<string, ReturnType<typeof makeItem>>();
      const responses: Array<{ itemId: string; correct: boolean }> = [];
      for (let i = 0; i < 10; i++) {
        const id = `item-${i}`;
        items.set(id, makeItem(id, 1, 0, 0.1));
        responses.push({ itemId: id, correct: true });
      }
      const result = ExamIrtCalculator.calculateTheta(responses, items);
      expect(result).not.toBeNull();
      expect(result!.theta).toBeGreaterThan(0);
    });

    it('returns negative theta for low performance', () => {
      const items = new Map<string, ReturnType<typeof makeItem>>();
      const responses: Array<{ itemId: string; correct: boolean }> = [];
      for (let i = 0; i < 10; i++) {
        const id = `item-${i}`;
        items.set(id, makeItem(id, 1, 0, 0.1));
        responses.push({ itemId: id, correct: false });
      }
      const result = ExamIrtCalculator.calculateTheta(responses, items);
      expect(result).not.toBeNull();
      expect(result!.theta).toBeLessThan(0);
    });

    it('SEM decreases with more informative items', () => {
      const mkSet = (count: number) => {
        const items = new Map<string, ReturnType<typeof makeItem>>();
        const responses: Array<{ itemId: string; correct: boolean }> = [];
        for (let i = 0; i < count; i++) {
          const id = `item-${i}`;
          items.set(id, makeItem(id, 1.5, 0, 0.1));
          responses.push({ itemId: id, correct: i % 2 === 0 });
        }
        return { items, responses };
      };
      const small = mkSet(5);
      const large = mkSet(20);
      const r1 = ExamIrtCalculator.calculateTheta(small.responses, small.items);
      const r2 = ExamIrtCalculator.calculateTheta(large.responses, large.items);
      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r2!.sem).toBeLessThan(r1!.sem);
    });

    it('skips non-calibrated items', () => {
      const items = new Map<string, ReturnType<typeof makeItem>>();
      for (let i = 0; i < 5; i++) {
        const item = makeItem(`item-${i}`, 1, 0, 0.1);
        if (i < 2) item.calibrationStatus = 'PILOT' as 'CALIBRATED';
        items.set(item.id, item);
      }
      const responses = [...items.keys()].map((id, i) => ({
        itemId: id,
        correct: i % 2 === 0,
      }));
      const result = ExamIrtCalculator.calculateTheta(responses, items);
      expect(result).not.toBeNull();
    });
  });

  describe('confidenceInterval', () => {
    it('returns valid range around scaled score', () => {
      const ci = ExamIrtCalculator.confidenceInterval(600, 0.5);
      expect(ci.lower).toBeLessThan(600);
      expect(ci.upper).toBeGreaterThan(600);
    });

    it('clamps lower to 200 and upper to 1000', () => {
      const ci = ExamIrtCalculator.confidenceInterval(210, 3);
      expect(ci.lower).toBe(200);
      const ci2 = ExamIrtCalculator.confidenceInterval(990, 3);
      expect(ci2.upper).toBe(1000);
    });
  });
});

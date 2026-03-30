import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassicalAnalysisService } from './classical-analysis.service';

const mockTx = { select: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    itemResponseLog: {
      itemId: 'item_id',
      tenantId: 'tenant_id',
      userId: 'user_id',
      isCorrect: 'is_correct',
      selectedOptionIndex: 'selected_option_index',
    },
    examItems: {
      id: 'id',
      courseId: 'course_id',
      tenantId: 'tenant_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

vi.mock('./ctt-math.js', () => ({
  computeDIndex: vi.fn(() => 0.45),
  computeRpbis: vi.fn(() => 0.38),
  computeOptionRpbis: vi.fn(() => 0.12),
}));

function makeSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('ClassicalAnalysisService', () => {
  let service: ClassicalAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClassicalAnalysisService();
  });

  describe('onModuleDestroy()', () => {
    it('closes DB pools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('analyzeItem()', () => {
    it('returns zero stats when no responses exist', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.analyzeItem('item-1', 't1');

      expect(result).toEqual({
        itemId: 'item-1',
        pValue: 0,
        dIndex: 0,
        rpbis: 0,
        totalResponses: 0,
      });
    });

    it('computes p-value and calls CTT math helpers', async () => {
      const responses = [
        { userId: 'u1', isCorrect: true, selectedOptionIndex: 0 },
        { userId: 'u2', isCorrect: false, selectedOptionIndex: 1 },
        { userId: 'u3', isCorrect: true, selectedOptionIndex: 0 },
        { userId: 'u4', isCorrect: false, selectedOptionIndex: 2 },
      ];
      const responseChain = makeSelectChain(responses);
      // computeUserTotalScores queries
      const u1Chain = makeSelectChain([{ isCorrect: true }, { isCorrect: true }]);
      const u2Chain = makeSelectChain([{ isCorrect: false }]);
      const u3Chain = makeSelectChain([{ isCorrect: true }]);
      const u4Chain = makeSelectChain([{ isCorrect: false }]);

      mockTx.select
        .mockReturnValueOnce({ from: responseChain.from })
        .mockReturnValueOnce({ from: u1Chain.from })
        .mockReturnValueOnce({ from: u2Chain.from })
        .mockReturnValueOnce({ from: u3Chain.from })
        .mockReturnValueOnce({ from: u4Chain.from });

      const result = await service.analyzeItem('item-1', 't1');

      expect(result.pValue).toBe(0.5);
      expect(result.totalResponses).toBe(4);
      expect(result.dIndex).toBe(0.45);
      expect(result.rpbis).toBe(0.38);
    });
  });

  describe('analyzeDistractors()', () => {
    it('returns empty distractors when no responses', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.analyzeDistractors('item-1', 't1');

      expect(result).toEqual({ itemId: 'item-1', distractors: [] });
    });

    it('computes distractor stats per option', async () => {
      const responses = [
        { userId: 'u1', isCorrect: true, selectedOptionIndex: 0 },
        { userId: 'u2', isCorrect: false, selectedOptionIndex: 1 },
        { userId: 'u3', isCorrect: false, selectedOptionIndex: 1 },
      ];
      const responseChain = makeSelectChain(responses);
      const u1Chain = makeSelectChain([{ isCorrect: true }]);
      const u2Chain = makeSelectChain([{ isCorrect: false }]);
      const u3Chain = makeSelectChain([{ isCorrect: false }]);

      mockTx.select
        .mockReturnValueOnce({ from: responseChain.from })
        .mockReturnValueOnce({ from: u1Chain.from })
        .mockReturnValueOnce({ from: u2Chain.from })
        .mockReturnValueOnce({ from: u3Chain.from });

      const result = await service.analyzeDistractors('item-1', 't1');

      expect(result.distractors.length).toBeGreaterThanOrEqual(2);
      const opt0 = result.distractors.find((d) => d.optionIndex === 0);
      expect(opt0).toBeDefined();
      expect(opt0!.selectionRate).toBeCloseTo(1 / 3);
    });

    it('skips options with negative index', async () => {
      const responses = [
        { userId: 'u1', isCorrect: false, selectedOptionIndex: null },
        { userId: 'u2', isCorrect: true, selectedOptionIndex: 0 },
      ];
      const responseChain = makeSelectChain(responses);
      const u1Chain = makeSelectChain([]);
      const u2Chain = makeSelectChain([{ isCorrect: true }]);

      mockTx.select
        .mockReturnValueOnce({ from: responseChain.from })
        .mockReturnValueOnce({ from: u1Chain.from })
        .mockReturnValueOnce({ from: u2Chain.from });

      const result = await service.analyzeDistractors('item-1', 't1');

      // Only option 0, not -1
      expect(result.distractors).toHaveLength(1);
      expect(result.distractors[0]!.optionIndex).toBe(0);
    });
  });

  describe('flagPoorItems()', () => {
    it('returns item IDs with poor CTT metrics', async () => {
      const itemsChain = makeSelectChain([{ id: 'i1' }, { id: 'i2' }]);
      mockTx.select.mockReturnValueOnce({ from: itemsChain.from });

      // Mock analyzeItem to return different stats
      const spy = vi.spyOn(service, 'analyzeItem' as never);
      (spy as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ itemId: 'i1', pValue: 0.10, dIndex: 0.1, rpbis: 0.1, totalResponses: 10 })
        .mockResolvedValueOnce({ itemId: 'i2', pValue: 0.50, dIndex: 0.5, rpbis: 0.5, totalResponses: 10 });

      const result = await service.flagPoorItems('c1', 't1');

      expect(result).toEqual(['i1']);
    });

    it('returns empty array when no items exist', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.flagPoorItems('c1', 't1');
      expect(result).toEqual([]);
    });
  });

  describe('computeUserTotalScores()', () => {
    it('returns map of user scores', async () => {
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: false },
      ];
      const u1Chain = makeSelectChain([{ isCorrect: true }, { isCorrect: true }]);
      const u2Chain = makeSelectChain([{ isCorrect: false }, { isCorrect: true }]);

      mockTx.select
        .mockReturnValueOnce({ from: u1Chain.from })
        .mockReturnValueOnce({ from: u2Chain.from });

      const scores = await service.computeUserTotalScores(responses, 't1');

      expect(scores.get('u1')).toBe(2);
      expect(scores.get('u2')).toBe(1);
    });
  });
});

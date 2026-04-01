import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamResultQueryService } from './exam-result-query.service';

const mockTx = { select: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    examResults: {
      sessionId: 'session_id',
      userId: 'user_id',
      blueprintId: 'blueprint_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

function makeSelectChainNoLimit(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

const ctx = { tenantId: 't1', userId: 'u1', userRole: 'STUDENT' as const };

describe('ExamResultQueryService', () => {
  let service: ExamResultQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExamResultQueryService();
  });

  describe('onModuleDestroy()', () => {
    it('closes DB pools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('getResult()', () => {
    it('returns exam result when found', async () => {
      const row = { sessionId: 's1', rawScore: 80, passed: true };
      const chain = makeSelectChain([row]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getResult('s1', ctx);
      expect(result).toEqual(row);
    });

    it('returns null when no result found', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getResult('missing', ctx);
      expect(result).toBeNull();
    });
  });

  describe('getMyResults()', () => {
    it('returns all results for user', async () => {
      const rows = [
        { sessionId: 's1', rawScore: 80 },
        { sessionId: 's2', rawScore: 90 },
      ];
      const chain = makeSelectChainNoLimit(rows);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getMyResults(ctx);
      expect(result).toHaveLength(2);
    });

    it('filters by courseId when provided', async () => {
      const chain = makeSelectChainNoLimit([{ sessionId: 's1' }]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getMyResults(ctx, 'course-1');

      expect(result).toHaveLength(1);
      const { and: andMock } = await import('@edusphere/db');
      expect(andMock).toHaveBeenCalled();
    });
  });

  describe('getBlueprintAnalytics()', () => {
    it('returns zeroed analytics when no results', async () => {
      const chain = makeSelectChainNoLimit([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getBlueprintAnalytics('bp1', ctx);

      expect(result).toEqual({
        blueprintId: 'bp1',
        totalSessions: 0,
        passRate: 0,
        averageScore: 0,
        averageTime: 0,
        domainBreakdown: [],
      });
    });

    it('computes pass rate, avg score, and domain breakdown', async () => {
      const results = [
        {
          sessionId: 's1',
          passed: true,
          scaledScore: 700,
          domainScores: [{ domain: 'Math', correct: 8, total: 10 }],
        },
        {
          sessionId: 's2',
          passed: false,
          scaledScore: 500,
          domainScores: [{ domain: 'Math', correct: 4, total: 10 }],
        },
        {
          sessionId: 's3',
          passed: true,
          scaledScore: 800,
          domainScores: [
            { domain: 'Math', correct: 9, total: 10 },
            { domain: 'Reading', correct: 7, total: 10 },
          ],
        },
      ];
      const chain = makeSelectChainNoLimit(results);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const analytics = await service.getBlueprintAnalytics('bp1', ctx);

      expect(analytics.totalSessions).toBe(3);
      expect(analytics.passRate).toBeCloseTo(0.67, 1);
      expect(analytics.averageScore).toBe(Math.round((700 + 500 + 800) / 3));
      expect(analytics.domainBreakdown.length).toBe(2);

      const mathDomain = analytics.domainBreakdown.find(
        (d: { domain: string }) => d.domain === 'Math'
      );
      expect(mathDomain).toBeDefined();
      expect(mathDomain!.correct).toBe(21);
      expect(mathDomain!.total).toBe(30);
    });
  });

  describe('getReliabilityReport()', () => {
    it('returns zeroed report when fewer than 2 sessions', async () => {
      const chain = makeSelectChainNoLimit([
        { rawScore: 80, itemAnalysis: [] },
      ]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const report = await service.getReliabilityReport('bp1', ctx);

      expect(report).toMatchObject({
        blueprintId: 'bp1',
        kr20: 0,
        cronbachAlpha: 0,
        sem: 0,
        totalSessions: 1,
      });
    });

    it('computes KR-20 and SEM for multiple sessions', async () => {
      const results = [
        { rawScore: 70, itemAnalysis: [{ correct: true }, { correct: false }] },
        { rawScore: 80, itemAnalysis: [{ correct: true }, { correct: true }] },
        { rawScore: 60, itemAnalysis: [{ correct: false }, { correct: true }] },
        { rawScore: 90, itemAnalysis: [{ correct: true }, { correct: true }] },
      ];
      const chain = makeSelectChainNoLimit(results);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const report = await service.getReliabilityReport('bp1', ctx);

      expect(report.totalSessions).toBe(4);
      expect(report.averageScore).toBe(75);
      expect(typeof report.kr20).toBe('number');
      expect(typeof report.sem).toBe('number');
      expect(report.cronbachAlpha).toBe(report.kr20);
    });

    it('returns zero report when no results', async () => {
      const chain = makeSelectChainNoLimit([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const report = await service.getReliabilityReport('bp1', ctx);

      expect(report.totalSessions).toBe(0);
      expect(report.kr20).toBe(0);
    });
  });
});

/**
 * PeerReviewRubricService unit tests — Phase 60 (360° Multi-Rater Assessments).
 * 5 test cases covering scoring, aggregation, and lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PeerReviewRubricService } from './peer-review-rubric.service.js';
import type { RaterScore } from './peer-review-rubric.service.js';

const { mockCloseAllPools, mockWithTenantContext } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockWithTenantContext: vi.fn(
    async (
      _db: unknown,
      _ctx: unknown,
      fn: () => Promise<unknown>
    ) => fn()
  ),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {},
  eq: vi.fn(),
  and: vi.fn(),
}));

const mockCtx = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'INSTRUCTOR' as const,
};

describe('PeerReviewRubricService', () => {
  let service: PeerReviewRubricService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PeerReviewRubricService();
  });

  it('scoreResponse returns weighted average across scores', async () => {
    const scores: RaterScore[] = [
      { criterionId: 'c1', raterId: 'r1', raterType: 'PEER', score: 4 },
      { criterionId: 'c1', raterId: 'r2', raterType: 'PEER', score: 6 },
    ];
    const result = await service.scoreResponse('response-1', scores, mockCtx);
    expect(result).toBe(5);
  });

  it('scoreResponse returns 0 for empty scores array', async () => {
    const result = await service.scoreResponse('response-2', [], mockCtx);
    expect(result).toBe(0);
  });

  it('getAggregatedResults returns an array', async () => {
    const results = await service.getAggregatedResults('campaign-1', mockCtx);
    expect(Array.isArray(results)).toBe(true);
  });

  it('onModuleDestroy calls closeAllPools', () => {
    service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });

  it('logger.log called with correct context on scoreResponse', async () => {
    const logSpy = vi.spyOn(
      (service as unknown as { logger: { log: (obj: unknown, msg: string) => void } }).logger,
      'log'
    );
    const scores: RaterScore[] = [
      { criterionId: 'c1', raterId: 'r1', raterType: 'SELF', score: 3.5 },
    ];
    await service.scoreResponse('resp-x', scores, mockCtx);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        responseId: 'resp-x',
        scoreCount: 1,
        tenantId: 'tenant-1',
      }),
      'Scores recorded'
    );
  });
});

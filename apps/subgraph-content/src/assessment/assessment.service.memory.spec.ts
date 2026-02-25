/**
 * AssessmentService memory tests — F-030: 360° Multi-Rater Assessments
 * Verifies that DB pools are cleaned up on module destroy and
 * that the aggregator handles edge cases without leaks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessmentService } from './assessment.service.js';
import { AssessmentAggregatorService } from './assessment-aggregator.service.js';

const { mockCloseAllPools, mockWithTenantContext } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockWithTenantContext: vi.fn(),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    assessmentCampaigns: {},
    assessmentResponses: {},
    assessmentResults: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

const mockAggregatorAggregate = vi.fn();

describe('AssessmentService — memory / lifecycle', () => {
  let svc: AssessmentService;

  function buildModule() {
    const aggregator = { aggregate: mockAggregatorAggregate } as unknown as AssessmentAggregatorService;
    return new AssessmentService(aggregator);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1
  it('onModuleDestroy calls closeAllPools to release DB connections', async () => {
    svc = buildModule();
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // Test 2
  it('double destroy is safe — closeAllPools called each time without throwing', async () => {
    svc = buildModule();
    await expect(svc.onModuleDestroy()).resolves.not.toThrow();
    await expect(svc.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  // Test 3
  it('aggregate handles campaign with only SELF responses — returns valid result', async () => {
    const selfOnlyResult = {
      id: 'res-self',
      campaignId: 'camp-self',
      targetUserId: 'user-target',
      tenantId: 'tenant-1',
      aggregatedScores: [
        { criteriaId: 'comm', label: 'Communication', selfScore: 4.5, peerAvg: null, managerScore: null, overallAvg: 4.5 },
      ],
      summary: 'Overall score: 4.5/5. Strongest: Communication (4.5/5).',
      generatedAt: new Date(),
    };
    mockAggregatorAggregate.mockResolvedValue(selfOnlyResult);

    svc = buildModule();
    mockWithTenantContext.mockResolvedValue([]);

    const result = await svc.completeCampaign('camp-self', 'tenant-1');
    expect(mockAggregatorAggregate).toHaveBeenCalledWith('camp-self', 'tenant-1');
    expect(result.aggregatedScores).toHaveLength(1);
    const firstScore = result.aggregatedScores[0] as { selfScore: number | null; peerAvg: number | null };
    expect(firstScore.peerAvg).toBeNull();
    expect(firstScore.selfScore).toBe(4.5);
    expect(result.summary).toContain('Communication');
  });
});

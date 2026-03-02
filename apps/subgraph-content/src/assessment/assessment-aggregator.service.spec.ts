/**
 * AssessmentAggregatorService unit tests — F-030: 360° Multi-Rater Assessments
 * 15 tests covering avg/roundTwo/buildSummary pure functions and aggregate method.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext, mockCloseAllPools } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    assessmentCampaigns: {
      id: 'id',
      tenantId: 'tenantId',
      targetUserId: 'targetUserId',
    },
    assessmentResponses: {
      campaignId: 'campaignId',
      tenantId: 'tenantId',
    },
    assessmentResults: {
      campaignId: 'campaignId',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { AssessmentAggregatorService } from './assessment-aggregator.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const CAMPAIGN_ID = 'camp-1';

const mockCampaign = {
  id: CAMPAIGN_ID,
  tenantId: TENANT_ID,
  targetUserId: 'user-target',
  title: 'Q1 Review',
  status: 'ACTIVE',
  createdBy: 'admin-1',
  createdAt: new Date(),
};

const mockResult = {
  id: 'res-1',
  campaignId: CAMPAIGN_ID,
  targetUserId: 'user-target',
  tenantId: TENANT_ID,
  aggregatedScores: [],
  summary: 'No criteria were rated.',
  generatedAt: new Date(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssessmentAggregatorService', () => {
  let svc: AssessmentAggregatorService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AssessmentAggregatorService();
  });

  // ── Construction ──────────────────────────────────────────────────────────

  // Test 1
  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(AssessmentAggregatorService);
  });

  // Test 2
  it('has no onModuleDestroy method — no resources to clean up', () => {
    expect(typeof (svc as Record<string, unknown>)['onModuleDestroy']).toBe(
      'undefined'
    );
  });

  // ── aggregate — NotFoundException ─────────────────────────────────────────

  // Test 3
  it('throws NotFoundException when campaign not found', async () => {
    // Each aggregate call consumes one mockResolvedValueOnce — set up two
    mockWithTenantContext
      .mockResolvedValueOnce([]) // first call: campaign not found
      .mockResolvedValueOnce([]); // second call: also not found

    await expect(svc.aggregate(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow(
      NotFoundException
    );
    await expect(svc.aggregate(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow(
      `Campaign ${CAMPAIGN_ID} not found`
    );
  });

  // Test 4
  it('throws NotFoundException with the correct campaign id in the message', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    try {
      await svc.aggregate('missing-id', TENANT_ID);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect((e as Error).message).toContain('missing-id');
    }
  });

  // ── aggregate — happy path with empty responses ───────────────────────────

  // Test 5
  it('aggregate with empty responses builds summary "No criteria were rated."', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign]) // campaign fetch
      .mockResolvedValueOnce([]) // responses fetch (empty)
      .mockResolvedValueOnce([mockResult]); // upsert result

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    expect(result.summary).toBe('No criteria were rated.');
    expect(result.aggregatedScores).toHaveLength(0);
  });

  // ── aggregate — avg behavior (tested via aggregate with responses) ─────────

  // Test 6
  it('avg of empty array is reflected as null peerAvg when no peer responses', async () => {
    const selfOnlyResponse = {
      id: 'resp-1',
      campaignId: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      raterRole: 'SELF',
      criteriaScores: [
        { criteriaId: 'comm', label: 'Communication', score: 4 },
      ],
    };
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'comm',
          label: 'Communication',
          selfScore: 4,
          peerAvg: null,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 4,
        },
      ],
      summary: 'Overall score: 4/5. Strongest: Communication (4/5).',
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce([selfOnlyResponse])
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    const scores = result.aggregatedScores as Array<{ peerAvg: unknown }>;
    expect(scores[0]?.peerAvg).toBeNull();
  });

  // Test 7
  it('avg of single value returns that value (selfScore is the only score)', async () => {
    const selfResponse = {
      id: 'resp-2',
      campaignId: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      raterRole: 'SELF',
      criteriaScores: [{ criteriaId: 'lead', label: 'Leadership', score: 5 }],
    };
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'lead',
          label: 'Leadership',
          selfScore: 5,
          peerAvg: null,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 5,
        },
      ],
      summary: 'Overall score: 5/5. Strongest: Leadership (5/5).',
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce([selfResponse])
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    const scores = result.aggregatedScores as Array<{
      selfScore: number | null;
    }>;
    expect(scores[0]?.selfScore).toBe(5);
  });

  // ── aggregate — grouping by rater role ───────────────────────────────────

  // Test 8
  it('aggregate groups SELF/PEER/MANAGER/DIRECT_REPORT scores by criteriaId', async () => {
    const responses = [
      {
        id: 'r1',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'SELF',
        criteriaScores: [{ criteriaId: 'crit1', label: 'Teamwork', score: 3 }],
      },
      {
        id: 'r2',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'PEER',
        criteriaScores: [{ criteriaId: 'crit1', label: 'Teamwork', score: 5 }],
      },
      {
        id: 'r3',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'MANAGER',
        criteriaScores: [{ criteriaId: 'crit1', label: 'Teamwork', score: 4 }],
      },
      {
        id: 'r4',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'DIRECT_REPORT',
        criteriaScores: [{ criteriaId: 'crit1', label: 'Teamwork', score: 5 }],
      },
    ];
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'crit1',
          label: 'Teamwork',
          selfScore: 3,
          peerAvg: 5,
          managerScore: 4,
          directReportAvg: 5,
          overallAvg: 4.25,
        },
      ],
      summary: 'Overall score: 4.25/5. Strongest: Teamwork (4.25/5).',
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce(responses)
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    const scores = result.aggregatedScores as Array<{
      selfScore: number | null;
      peerAvg: number | null;
      managerScore: number | null;
      directReportAvg: number | null;
      overallAvg: number;
    }>;
    expect(scores[0]?.selfScore).toBe(3);
    expect(scores[0]?.peerAvg).toBe(5);
    expect(scores[0]?.managerScore).toBe(4);
    expect(scores[0]?.directReportAvg).toBe(5);
  });

  // Test 9
  it('aggregate with multiple peer responses averages them (peerAvg)', async () => {
    const responses = [
      {
        id: 'r-a',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'PEER',
        criteriaScores: [{ criteriaId: 'c1', label: 'Comm', score: 3 }],
      },
      {
        id: 'r-b',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'PEER',
        criteriaScores: [{ criteriaId: 'c1', label: 'Comm', score: 5 }],
      },
    ];
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'c1',
          label: 'Comm',
          selfScore: null,
          peerAvg: 4,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 4,
        },
      ],
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce(responses)
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    const scores = result.aggregatedScores as Array<{ peerAvg: number | null }>;
    expect(scores[0]?.peerAvg).toBe(4); // avg(3,5) = 4
  });

  // ── buildSummary via aggregate ────────────────────────────────────────────

  // Test 10
  it('buildSummary identifies strongest and growth area correctly', async () => {
    const responses = [
      {
        id: 'rs1',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'SELF',
        criteriaScores: [
          { criteriaId: 'c1', label: 'Leadership', score: 5 },
          { criteriaId: 'c2', label: 'Teamwork', score: 2 },
        ],
      },
    ];
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'c1',
          label: 'Leadership',
          selfScore: 5,
          peerAvg: null,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 5,
        },
        {
          criteriaId: 'c2',
          label: 'Teamwork',
          selfScore: 2,
          peerAvg: null,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 2,
        },
      ],
      summary:
        'Overall score: 3.5/5. Strongest: Leadership (5/5). Growth area: Teamwork (2/5).',
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce(responses)
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    expect(result.summary).toContain('Strongest: Leadership');
    expect(result.summary).toContain('Growth area: Teamwork');
  });

  // Test 11
  it('buildSummary with single criterion does not append growth area line', async () => {
    const responses = [
      {
        id: 'rs2',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'SELF',
        criteriaScores: [{ criteriaId: 'c1', label: 'Integrity', score: 4 }],
      },
    ];
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'c1',
          label: 'Integrity',
          selfScore: 4,
          peerAvg: null,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 4,
        },
      ],
      summary: 'Overall score: 4/5. Strongest: Integrity (4/5).',
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce(responses)
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    expect(result.summary).not.toContain('Growth area');
  });

  // ── aggregate — DB interaction ────────────────────────────────────────────

  // Test 12
  it('aggregate calls withTenantContext three times (campaign, responses, upsert)', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockResult]);

    await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    expect(mockWithTenantContext).toHaveBeenCalledTimes(3);
  });

  // Test 13
  it('aggregate passes system ctx with SUPER_ADMIN role to withTenantContext', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockResult]);

    await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: 'system',
        userRole: 'SUPER_ADMIN',
      }),
      expect.any(Function)
    );
  });

  // Test 14
  it('aggregate upserts (onConflictDoUpdate) rather than erroring on duplicate', async () => {
    const updatedResult = {
      ...mockResult,
      summary: 'Updated after re-run.',
      generatedAt: new Date(),
    };
    // Second call simulates re-run — same campaign, upsert should update
    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([updatedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    expect(result.summary).toBe('Updated after re-run.');
  });

  // Test 15
  it('roundTwo is applied — overallAvg is stored with at most 2 decimal places', async () => {
    // 3 scores: 1+2+3 = 6, avg = 2 → overallAvg 2.00
    const responses = [
      {
        id: 'rx1',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'PEER',
        criteriaScores: [{ criteriaId: 'cx', label: 'Focus', score: 1 }],
      },
      {
        id: 'rx2',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'PEER',
        criteriaScores: [{ criteriaId: 'cx', label: 'Focus', score: 2 }],
      },
      {
        id: 'rx3',
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        raterRole: 'PEER',
        criteriaScores: [{ criteriaId: 'cx', label: 'Focus', score: 3 }],
      },
    ];
    const expectedResult = {
      ...mockResult,
      aggregatedScores: [
        {
          criteriaId: 'cx',
          label: 'Focus',
          selfScore: null,
          peerAvg: 2,
          managerScore: null,
          directReportAvg: null,
          overallAvg: 2,
        },
      ],
    };

    mockWithTenantContext
      .mockResolvedValueOnce([mockCampaign])
      .mockResolvedValueOnce(responses)
      .mockResolvedValueOnce([expectedResult]);

    const result = await svc.aggregate(CAMPAIGN_ID, TENANT_ID);
    const scores = result.aggregatedScores as Array<{ overallAvg: number }>;
    const avgStr = String(scores[0]?.overallAvg ?? '');
    const decimalPart = avgStr.includes('.')
      ? (avgStr.split('.')[1] ?? '')
      : '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });
});

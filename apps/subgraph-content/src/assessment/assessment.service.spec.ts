/**
 * AssessmentService unit tests — F-030: 360° Multi-Rater Assessments
 * 10 test cases covering campaign lifecycle and response handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { AssessmentService } from './assessment.service.js';
import { AssessmentAggregatorService } from './assessment-aggregator.service.js';

const { mockWithTenantContext, mockCloseAllPools } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    assessmentCampaigns: {
      id: 'id',
      tenantId: 'tenant_id',
      targetUserId: 'target_user_id',
      status: 'status',
    },
    assessmentResponses: {},
    assessmentResults: { campaignId: 'campaign_id', tenantId: 'tenant_id' },
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

const mockCampaign = {
  id: 'camp-1',
  tenantId: 'tenant-1',
  targetUserId: 'user-target',
  title: 'Q1 Review',
  rubric: { criteria: [] },
  status: 'DRAFT',
  dueDate: null,
  courseId: null,
  createdBy: 'admin-1',
  createdAt: new Date(),
};

const mockResponse = {
  id: 'resp-1',
  campaignId: 'camp-1',
  responderId: 'user-rater',
  tenantId: 'tenant-1',
  raterRole: 'PEER',
  criteriaScores: { comm: 4 },
  narrative: 'Good communicator',
  submittedAt: new Date(),
};

const mockResult = {
  id: 'res-1',
  campaignId: 'camp-1',
  targetUserId: 'user-target',
  tenantId: 'tenant-1',
  aggregatedScores: [],
  summary: 'Overall score: 4.0/5.',
  generatedAt: new Date(),
};

describe('AssessmentService', () => {
  let svc: AssessmentService;
  let aggregatorMock: vi.Mocked<AssessmentAggregatorService>;

  beforeEach(async () => {
    vi.clearAllMocks();
    aggregatorMock = {
      aggregate: vi.fn().mockResolvedValue(mockResult),
    } as unknown as vi.Mocked<AssessmentAggregatorService>;

    svc = new AssessmentService(
      aggregatorMock as unknown as AssessmentAggregatorService
    );
  });

  // Test 1
  it('createCampaign stores campaign with DRAFT status', async () => {
    mockWithTenantContext.mockResolvedValue([mockCampaign]);
    const result = await svc.createCampaign(
      { title: 'Q1 Review', targetUserId: 'user-target', rubric: {} },
      'tenant-1',
      'admin-1'
    );
    expect(result.status).toBe('DRAFT');
    expect(mockWithTenantContext).toHaveBeenCalled();
  });

  // Test 2
  it('activateCampaign sets status to ACTIVE', async () => {
    mockWithTenantContext.mockResolvedValue([
      { ...mockCampaign, status: 'ACTIVE' },
    ]);
    const result = await svc.activateCampaign('camp-1', 'tenant-1');
    expect(result.status).toBe('ACTIVE');
  });

  // Test 3
  it('submitResponse stores criteria scores', async () => {
    mockWithTenantContext.mockResolvedValue([mockResponse]);
    const result = await svc.submitResponse(
      'camp-1',
      'user-rater',
      'PEER',
      { comm: 4 },
      'Good',
      'tenant-1'
    );
    expect(result.criteriaScores).toEqual({ comm: 4 });
    expect(mockWithTenantContext).toHaveBeenCalled();
  });

  // Test 4
  it('submitResponse throws ConflictException on duplicate responder+role', async () => {
    mockWithTenantContext.mockRejectedValue(
      new Error('assessment_responses_responder_unique violation')
    );
    await expect(
      svc.submitResponse(
        'camp-1',
        'user-rater',
        'PEER',
        { comm: 4 },
        null,
        'tenant-1'
      )
    ).rejects.toThrow(ConflictException);
  });

  // Test 5
  it('listCampaignsForTarget returns only campaigns where user is target', async () => {
    mockWithTenantContext.mockResolvedValue([mockCampaign]);
    const result = await svc.listCampaignsForTarget('user-target', 'tenant-1');
    expect(result).toHaveLength(1);
    expect(result[0]!.targetUserId).toBe('user-target');
    expect(mockWithTenantContext).toHaveBeenCalled();
  });

  // Test 6
  it('listCampaignsForResponder returns active campaigns to respond to', async () => {
    const activeCampaign = { ...mockCampaign, status: 'ACTIVE' };
    mockWithTenantContext.mockResolvedValue([activeCampaign]);
    const result = await svc.listCampaignsForResponder(
      'user-rater',
      'tenant-1'
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe('ACTIVE');
  });

  // Test 7
  it('completeCampaign sets COMPLETED and calls aggregator', async () => {
    mockWithTenantContext.mockResolvedValue([]);
    const result = await svc.completeCampaign('camp-1', 'tenant-1');
    expect(aggregatorMock.aggregate).toHaveBeenCalledWith('camp-1', 'tenant-1');
    expect(result).toEqual(mockResult);
  });

  // Test 8
  it('getResult returns null when no result exists', async () => {
    mockWithTenantContext.mockResolvedValue([]);
    const result = await svc.getResult('camp-1', 'tenant-1');
    expect(result).toBeNull();
  });

  // Test 9
  it('getResult returns result after aggregation', async () => {
    mockWithTenantContext.mockResolvedValue([mockResult]);
    const result = await svc.getResult('camp-1', 'tenant-1');
    expect(result).toEqual(mockResult);
    expect(result?.campaignId).toBe('camp-1');
  });

  // Test 10
  it('submitResponse wraps DB call in withTenantContext', async () => {
    mockWithTenantContext.mockResolvedValue([mockResponse]);
    await svc.submitResponse(
      'camp-1',
      'user-rater',
      'SELF',
      { comm: 5 },
      null,
      'tenant-1'
    );
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-rater' }),
      expect.any(Function)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});

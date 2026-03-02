import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

vi.mock('@edusphere/auth', () => ({}));

import { AssessmentResolver } from './assessment.resolver.js';
import type { AssessmentService } from './assessment.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockListCampaignsForTarget = vi.fn();
const mockListCampaignsForResponder = vi.fn();
const mockGetResult = vi.fn();
const mockCreateCampaign = vi.fn();
const mockActivateCampaign = vi.fn();
const mockSubmitResponse = vi.fn();
const mockCompleteCampaign = vi.fn();

const mockSvc = {
  listCampaignsForTarget: mockListCampaignsForTarget,
  listCampaignsForResponder: mockListCampaignsForResponder,
  getResult: mockGetResult,
  createCampaign: mockCreateCampaign,
  activateCampaign: mockActivateCampaign,
  submitResponse: mockSubmitResponse,
  completeCampaign: mockCompleteCampaign,
} as unknown as AssessmentService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeCtx = (overrides?: { userId?: string; tenantId?: string }) => ({
  authContext: {
    userId: overrides?.userId ?? 'u1',
    tenantId: overrides?.tenantId ?? 't1',
    roles: ['STUDENT'],
  },
});

const noAuthCtx = { authContext: undefined };

const CAMPAIGN_ROW = {
  id: 'camp-1',
  title: 'Quarterly Review',
  targetUserId: 'target-1',
  status: 'DRAFT',
  dueDate: new Date('2026-06-30T00:00:00.000Z'),
  rubric: {
    criteria: [
      { id: 'c1', label: 'Communication' },
      { id: 'c2', label: 'Teamwork' },
    ],
  },
};

const RESULT_ROW = {
  campaignId: 'camp-1',
  aggregatedScores: [{ criteriaId: 'c1', avg: 4.2 }],
  summary: 'Good performance',
  generatedAt: new Date('2026-01-15T10:00:00.000Z'),
  tenantId: 't1',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssessmentResolver', () => {
  let resolver: AssessmentResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AssessmentResolver(mockSvc);
  });

  // ── myCampaigns ─────────────────────────────────────────────────────────────

  describe('myCampaigns', () => {
    it('returns mapped campaigns list for authenticated user', async () => {
      mockListCampaignsForTarget.mockResolvedValueOnce([CAMPAIGN_ROW]);

      const result = await resolver.myCampaigns(makeCtx());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'camp-1',
        title: 'Quarterly Review',
        targetUserId: 'target-1',
        status: 'DRAFT',
        dueDate: '2026-06-30T00:00:00.000Z',
        criteriaCount: 2,
      });
      expect(mockListCampaignsForTarget).toHaveBeenCalledWith('u1', 't1');
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(resolver.myCampaigns(noAuthCtx)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockListCampaignsForTarget).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = {
        authContext: {
          userId: undefined as unknown as string,
          tenantId: 't1',
          roles: ['STUDENT'],
        },
      };
      await expect(resolver.myCampaigns(ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── mapCampaign output shape ─────────────────────────────────────────────────

  describe('mapCampaign output shape', () => {
    it('maps dueDate to ISO string', async () => {
      mockListCampaignsForTarget.mockResolvedValueOnce([CAMPAIGN_ROW]);

      const [mapped] = await resolver.myCampaigns(makeCtx());

      expect(mapped!.dueDate).toBe('2026-06-30T00:00:00.000Z');
    });

    it('maps null dueDate to null', async () => {
      mockListCampaignsForTarget.mockResolvedValueOnce([
        { ...CAMPAIGN_ROW, dueDate: null },
      ]);

      const [mapped] = await resolver.myCampaigns(makeCtx());

      expect(mapped!.dueDate).toBeNull();
    });

    it('maps criteriaCount from rubric.criteria.length', async () => {
      mockListCampaignsForTarget.mockResolvedValueOnce([CAMPAIGN_ROW]);

      const [mapped] = await resolver.myCampaigns(makeCtx());

      expect(mapped!.criteriaCount).toBe(2);
    });

    it('maps criteriaCount to 0 when rubric has no criteria', async () => {
      mockListCampaignsForTarget.mockResolvedValueOnce([
        { ...CAMPAIGN_ROW, rubric: {} },
      ]);

      const [mapped] = await resolver.myCampaigns(makeCtx());

      expect(mapped!.criteriaCount).toBe(0);
    });
  });

  // ── campaignsToRespond ──────────────────────────────────────────────────────

  describe('campaignsToRespond', () => {
    it('returns mapped campaigns for responder', async () => {
      mockListCampaignsForResponder.mockResolvedValueOnce([CAMPAIGN_ROW]);

      const result = await resolver.campaignsToRespond(makeCtx());

      expect(result).toHaveLength(1);
      expect(mockListCampaignsForResponder).toHaveBeenCalledWith('u1', 't1');
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(resolver.campaignsToRespond(noAuthCtx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── assessmentResult ─────────────────────────────────────────────────────────

  describe('assessmentResult', () => {
    it('returns null when no result exists', async () => {
      mockGetResult.mockResolvedValueOnce(null);

      const result = await resolver.assessmentResult('camp-1', makeCtx());

      expect(result).toBeNull();
    });

    it('maps result with generatedAt ISO string', async () => {
      mockGetResult.mockResolvedValueOnce(RESULT_ROW);

      const result = await resolver.assessmentResult('camp-1', makeCtx());

      expect(result).not.toBeNull();
      expect(result!.generatedAt).toBe('2026-01-15T10:00:00.000Z');
      expect(result!.campaignId).toBe('camp-1');
    });

    it('throws UnauthorizedException when tenantId missing', async () => {
      const ctx = {
        authContext: {
          userId: 'u1',
          tenantId: undefined as unknown as string,
          roles: ['STUDENT'],
        },
      };
      await expect(resolver.assessmentResult('camp-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── createAssessmentCampaign ─────────────────────────────────────────────────

  describe('createAssessmentCampaign', () => {
    it('throws UnauthorizedException when no auth', async () => {
      await expect(
        resolver.createAssessmentCampaign(
          'Review',
          'target-1',
          undefined,
          noAuthCtx
        )
      ).rejects.toThrow(UnauthorizedException);
      expect(mockCreateCampaign).not.toHaveBeenCalled();
    });

    it('returns mapped campaign from service', async () => {
      mockCreateCampaign.mockResolvedValueOnce(CAMPAIGN_ROW);

      const result = await resolver.createAssessmentCampaign(
        'Quarterly Review',
        'target-1',
        undefined,
        makeCtx()
      );

      expect(result.id).toBe('camp-1');
      expect(result.title).toBe('Quarterly Review');
    });
  });

  // ── submitAssessmentResponse ─────────────────────────────────────────────────

  describe('submitAssessmentResponse', () => {
    it('parses criteriaScores as JSON and returns true', async () => {
      mockSubmitResponse.mockResolvedValueOnce({});

      const scores = JSON.stringify({ c1: 4, c2: 5 });
      const result = await resolver.submitAssessmentResponse(
        'camp-1',
        'PEER',
        scores,
        'Great teamwork',
        makeCtx()
      );

      expect(result).toBe(true);
      expect(mockSubmitResponse).toHaveBeenCalledWith(
        'camp-1',
        'u1',
        'PEER',
        { c1: 4, c2: 5 },
        'Great teamwork',
        't1'
      );
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(
        resolver.submitAssessmentResponse(
          'camp-1',
          'SELF',
          '{}',
          undefined,
          noAuthCtx
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── completeAssessmentCampaign ───────────────────────────────────────────────

  describe('completeAssessmentCampaign', () => {
    it('returns aggregated result with ISO generatedAt', async () => {
      mockCompleteCampaign.mockResolvedValueOnce(RESULT_ROW);

      const result = await resolver.completeAssessmentCampaign(
        'camp-1',
        makeCtx()
      );

      expect(result.campaignId).toBe('camp-1');
      expect(result.generatedAt).toBe('2026-01-15T10:00:00.000Z');
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(
        resolver.completeAssessmentCampaign('camp-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

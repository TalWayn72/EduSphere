import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./competency-goal.service', () => ({
  CompetencyGoalService: vi.fn(),
}));

import { CompetencyGoalResolver } from './competency-goal.resolver.js';

const CTX_AUTHED = {
  req: {},
  authContext: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['STUDENT'],
    scopes: [],
  },
};

const CTX_ANON = { req: {}, authContext: undefined };

const MOCK_GOAL = {
  id: 'goal-1',
  targetConceptName: 'Photosynthesis',
  targetLevel: 'ADVANCED',
  userId: 'user-1',
  tenantId: 'tenant-1',
};

describe('CompetencyGoalResolver', () => {
  let resolver: CompetencyGoalResolver;
  let competencyGoalService: {
    getMyGoals: ReturnType<typeof vi.fn>;
    addGoal: ReturnType<typeof vi.fn>;
    removeGoal: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    competencyGoalService = {
      getMyGoals: vi.fn(),
      addGoal: vi.fn(),
      removeGoal: vi.fn(),
    };
    resolver = new CompetencyGoalResolver(competencyGoalService as never);
  });

  // ── getMyCompetencyGoals ────────────────────────────────────────────────────

  describe('getMyCompetencyGoals()', () => {
    it('delegates to service with userId and tenantId', async () => {
      competencyGoalService.getMyGoals.mockResolvedValue([MOCK_GOAL]);
      const result = await resolver.getMyCompetencyGoals(CTX_AUTHED);
      expect(result).toEqual([MOCK_GOAL]);
      expect(competencyGoalService.getMyGoals).toHaveBeenCalledWith(
        'user-1',
        'tenant-1'
      );
    });

    it('returns empty array when no goals exist', async () => {
      competencyGoalService.getMyGoals.mockResolvedValue([]);
      const result = await resolver.getMyCompetencyGoals(CTX_AUTHED);
      expect(result).toEqual([]);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.getMyCompetencyGoals(CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── addCompetencyGoal ───────────────────────────────────────────────────────

  describe('addCompetencyGoal()', () => {
    it('delegates to service with userId, tenantId, conceptName and level', async () => {
      competencyGoalService.addGoal.mockResolvedValue(MOCK_GOAL);
      await resolver.addCompetencyGoal(
        'Photosynthesis',
        'ADVANCED',
        CTX_AUTHED
      );
      expect(competencyGoalService.addGoal).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        'Photosynthesis',
        'ADVANCED'
      );
    });

    it('passes undefined targetLevel when not provided', async () => {
      competencyGoalService.addGoal.mockResolvedValue(MOCK_GOAL);
      await resolver.addCompetencyGoal('Mitosis', undefined, CTX_AUTHED);
      expect(competencyGoalService.addGoal).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        'Mitosis',
        undefined
      );
    });

    it('returns the created goal', async () => {
      competencyGoalService.addGoal.mockResolvedValue(MOCK_GOAL);
      const result = await resolver.addCompetencyGoal(
        'Photosynthesis',
        'ADVANCED',
        CTX_AUTHED
      );
      expect(result).toEqual(MOCK_GOAL);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.addCompetencyGoal('concept', undefined, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── removeCompetencyGoal ────────────────────────────────────────────────────

  describe('removeCompetencyGoal()', () => {
    it('delegates to service with goalId, userId and tenantId', async () => {
      competencyGoalService.removeGoal.mockResolvedValue(true);
      const result = await resolver.removeCompetencyGoal('goal-1', CTX_AUTHED);
      expect(result).toBe(true);
      expect(competencyGoalService.removeGoal).toHaveBeenCalledWith(
        'goal-1',
        'user-1',
        'tenant-1'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.removeCompetencyGoal('goal-1', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates service errors', async () => {
      competencyGoalService.removeGoal.mockRejectedValue(
        new Error('Not found')
      );
      await expect(
        resolver.removeCompetencyGoal('goal-999', CTX_AUTHED)
      ).rejects.toThrow('Not found');
    });
  });
});

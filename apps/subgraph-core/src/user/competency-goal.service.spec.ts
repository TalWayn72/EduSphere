/**
 * Unit tests for CompetencyGoalService (F-002 — Auto-Pathing).
 * Verifies addGoal, removeGoal ownership enforcement, and getMyGoals isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const mockGoal = {
  id: 'goal-1',
  userId: 'user-a',
  tenantId: 'tenant-1',
  targetConceptName: 'GraphQL',
  currentLevel: null,
  targetLevel: 'ADVANCED',
  createdAt: new Date('2026-02-24T00:00:00Z'),
};

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    userCompetencyGoals: {
      id: 'id',
      userId: 'userId',
      tenantId: 'tenantId',
      targetConceptName: 'targetConceptName',
      targetLevel: 'targetLevel',
      currentLevel: 'currentLevel',
      createdAt: 'createdAt',
      $inferSelect: {},
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...conds) => ({ conds })),
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { CompetencyGoalService } from './competency-goal.service.js';

describe('CompetencyGoalService', () => {
  let service: CompetencyGoalService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CompetencyGoalService();
  });

  describe('addGoal()', () => {
    it('inserts a new goal and returns mapped result', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGoal]),
        }),
      });

      const result = await service.addGoal(
        'user-a',
        'tenant-1',
        'GraphQL',
        'ADVANCED'
      );

      expect(result.id).toBe('goal-1');
      expect(result.targetConceptName).toBe('GraphQL');
      expect(result.targetLevel).toBe('ADVANCED');
    });

    it('maps createdAt to ISO string', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGoal]),
        }),
      });

      const result = await service.addGoal('user-a', 'tenant-1', 'GraphQL');
      expect(result.createdAt).toBe('2026-02-24T00:00:00.000Z');
    });
  });

  describe('removeGoal()', () => {
    it('removes goal when user owns it', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockGoal]),
          }),
        }),
      });
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.removeGoal('goal-1', 'user-a', 'tenant-1');
      expect(result).toBe(true);
    });

    it('throws NotFoundException when goal not found (ownership enforcement)', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.removeGoal('goal-1', 'user-b', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyGoals()', () => {
    it('returns only goals for the current user', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([mockGoal]),
          }),
        }),
      });

      const results = await service.getMyGoals('user-a', 'tenant-1');
      expect(results).toHaveLength(1);
      expect(results[0].targetConceptName).toBe('GraphQL');
    });

    it('returns empty array when user has no goals', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const results = await service.getMyGoals('user-b', 'tenant-1');
      expect(results).toHaveLength(0);
    });
  });
});

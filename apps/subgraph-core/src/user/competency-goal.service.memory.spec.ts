/**
 * Memory leak test for CompetencyGoalService (F-002).
 * Verifies onModuleDestroy() calls closeAllPools() per iron-rule.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: { userCompetencyGoals: {} },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { CompetencyGoalService } from './competency-goal.service.js';

describe('CompetencyGoalService — memory safety', () => {
  let service: CompetencyGoalService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CompetencyGoalService();
  });

  it('calls closeAllPools() exactly once during onModuleDestroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onModuleDestroy() called multiple times', async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('implements OnModuleDestroy (onModuleDestroy method exists)', () => {
    expect(typeof service.onModuleDestroy).toBe('function');
  });
});

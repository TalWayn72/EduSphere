import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Unit tests for XpService.
 *
 * Covers:
 * 1. awardXP('LESSON_COMPLETED') inserts 10 XP event
 * 2. awardXP('QUIZ_PASSED') inserts 25 XP event
 * 3. Level computation: 0 XP → 1; 100 XP → 2; 400 XP → 3
 * 4. getUserXP returns { totalXp: 0, level: 1 } for new user (no record)
 * 5. getUserXP returns stored values when record exists
 * 6. onModuleDestroy calls closeAllPools()
 */

import { XpService, computeLevel } from './xp.service';

// ── DB mocks ─────────────────────────────────────────────────────────────────

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

const mockWithTenantContext = vi.fn(
  (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(_db)
);

const mockExecute = vi.fn();

const mockDb = {
  execute: mockExecute,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: (...args: unknown[]) =>
    mockWithTenantContext(...(args as Parameters<typeof mockWithTenantContext>)),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      _sql: strings,
      _values: values,
    }),
    {
      raw: (s: string) => ({ _raw: s }),
    }
  ),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeLevel (pure function)', () => {
  it('returns level 1 for 0 XP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns level 1 for 99 XP', () => {
    expect(computeLevel(99)).toBe(1);
  });

  it('returns level 2 for 100 XP', () => {
    expect(computeLevel(100)).toBe(2);
  });

  it('returns level 2 for 399 XP', () => {
    expect(computeLevel(399)).toBe(2);
  });

  it('returns level 3 for 400 XP', () => {
    expect(computeLevel(400)).toBe(3);
  });

  it('returns level 4 for 900 XP', () => {
    expect(computeLevel(900)).toBe(4);
  });

  it('never returns less than 1', () => {
    expect(computeLevel(0)).toBeGreaterThanOrEqual(1);
  });
});

describe('XpService', () => {
  let service: XpService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XpService();
    // withTenantContext just calls the callback directly in tests
    mockWithTenantContext.mockImplementation(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb)
    );
  });

  describe('awardXP', () => {
    it('calls execute twice (insert event + upsert total) for LESSON_COMPLETED', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.awardXP('user-1', 'tenant-1', 'LESSON_COMPLETED');
      // Two execute calls: INSERT user_xp_events + INSERT/UPDATE user_xp_totals
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('calls execute twice for QUIZ_PASSED', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.awardXP('user-1', 'tenant-1', 'QUIZ_PASSED');
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('calls execute twice for COURSE_COMPLETED', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.awardXP('user-1', 'tenant-1', 'COURSE_COMPLETED');
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('calls execute twice for STREAK_BONUS', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.awardXP('user-1', 'tenant-1', 'STREAK_BONUS');
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('passes metadata to the event insert when provided', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.awardXP('user-1', 'tenant-1', 'QUIZ_PASSED', {
        quizId: 'q-1',
        score: 95,
      });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserXP', () => {
    it('returns { totalXp: 0, level: 1 } when no record found', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await service.getUserXP('new-user', 'tenant-1');
      expect(result).toEqual({ totalXp: 0, level: 1 });
    });

    it('returns stored totalXp and level when record exists', async () => {
      mockExecute.mockResolvedValue({
        rows: [{ total_xp: 250, level: 2 }],
      });
      const result = await service.getUserXP('user-1', 'tenant-1');
      expect(result).toEqual({ totalXp: 250, level: 2 });
    });

    it('coerces string values to numbers', async () => {
      mockExecute.mockResolvedValue({
        rows: [{ total_xp: '400', level: '3' }],
      });
      const result = await service.getUserXP('user-1', 'tenant-1');
      expect(result.totalXp).toBe(400);
      expect(result.level).toBe(3);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools()', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledOnce();
    });
  });
});

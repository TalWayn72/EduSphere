import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @edusphere/db ────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockOffset = vi.fn();
const mockLimit = vi.fn(() => ({ offset: mockOffset }));
const mockWhere = vi.fn(() => ({ limit: mockLimit, offset: mockOffset }));
const mockFrom = vi.fn(() => ({ where: mockWhere, limit: mockLimit }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockOnConflict = vi.fn(() => ({ returning: mockReturning }));
const mockInsertValues = vi.fn(() => ({
  returning: mockReturning,
  onConflictDoUpdate: mockOnConflict,
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    select: mockSelect,
    insert: mockInsert,
    execute: vi.fn().mockResolvedValue(undefined),
  })
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    transaction: mockTransaction,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        select: mockSelect,
        insert: mockInsert,
        execute: vi.fn().mockResolvedValue(undefined),
      })
  ),
  skills: {
    id: 'id',
    category: 'category',
    tenantId: 'tenantId',
    userId: 'userId',
    skillId: 'skillId',
  },
  skillPrerequisites: {
    skillId: 'skillId',
    prerequisiteSkillId: 'prerequisiteSkillId',
  },
  skillPaths: {
    id: 'id',
    tenantId: 'tenantId',
  },
  learnerSkillProgress: {
    tenantId: 'tenantId',
    userId: 'userId',
    skillId: 'skillId',
    masteryLevel: 'masteryLevel',
    evidenceCount: 'evidenceCount',
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((col: unknown, vals: unknown) => ({ col, vals })),
  sql: Object.assign(
    vi.fn((parts: TemplateStringsArray, ...vals: unknown[]) => ({
      parts,
      vals,
    })),
    { raw: vi.fn((s: string) => s) }
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { SkillService } from './skill.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockAuth = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['STUDENT' as const],
  email: 'user@example.com',
  username: 'user1',
  scopes: [],
  isSuperAdmin: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SkillService', () => {
  let service: SkillService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SkillService();
  });

  it('listSkills() returns array of skills', async () => {
    const fakeSkills = [{ id: 'skill-1', name: 'TypeScript' }];
    mockOffset.mockResolvedValueOnce(fakeSkills);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ offset: mockOffset });

    const result = await service.listSkills(undefined, 50, 0);
    expect(result).toEqual(fakeSkills);
    expect(mockSelect).toHaveBeenCalled();
  });

  it('getSkill() returns null for non-existent id', async () => {
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ offset: mockOffset });
    // select().from().where() returns a thenable — simulate empty result
    const mockWhereEmpty = vi.fn().mockResolvedValueOnce([]);
    mockFrom.mockReturnValueOnce({ where: mockWhereEmpty });

    const result = await service.getSkill('nonexistent-id');
    expect(result).toBeNull();
  });

  it('getSkill() returns first row when found', async () => {
    const fakeSkill = { id: 'skill-1', name: 'TypeScript' };
    const mockWhereFound = vi.fn().mockResolvedValueOnce([fakeSkill]);
    mockFrom.mockReturnValueOnce({ where: mockWhereFound });

    const result = await service.getSkill('skill-1');
    expect(result).toEqual(fakeSkill);
  });

  it('updateMySkillProgress() calls onConflictDoUpdate', async () => {
    const fakeProgress = {
      skillId: 'skill-1',
      masteryLevel: 'PROFICIENT',
      evidenceCount: 2,
    };
    mockReturning.mockResolvedValueOnce([fakeProgress]);

    const result = await service.updateMySkillProgress(
      mockAuth,
      'skill-1',
      'PROFICIENT'
    );
    expect(mockOnConflict).toHaveBeenCalled();
    expect(result).toEqual(fakeProgress);
  });

  it('getSkillGapAnalysis() returns correct completionPct when all mastered', async () => {
    const fakePath = {
      id: 'path-1',
      skillIds: ['skill-a', 'skill-b'],
      tenantId: 'tenant-1',
    };
    // listSkillPaths returns one path
    const mockWhereList = vi.fn().mockResolvedValueOnce([fakePath]);
    const mockLimitList = vi.fn(() => ({ offset: mockOffset }));
    const mockFromList = vi.fn(() => ({
      where: mockWhereList,
      limit: mockLimitList,
    }));
    mockSelect.mockReturnValueOnce({ from: mockFromList });
    mockOffset.mockResolvedValueOnce([fakePath]);

    // getMySkillProgress returns both skills mastered
    const progress = [
      { skillId: 'skill-a', masteryLevel: 'MASTERED', tenantId: 'tenant-1', userId: 'user-1' },
      { skillId: 'skill-b', masteryLevel: 'PROFICIENT', tenantId: 'tenant-1', userId: 'user-1' },
    ];
    const mockWhereProgress = vi.fn().mockResolvedValueOnce(progress);
    const mockFromProgress = vi.fn(() => ({ where: mockWhereProgress }));
    mockSelect.mockReturnValueOnce({ from: mockFromProgress });

    const result = await service.getSkillGapAnalysis(mockAuth, 'path-1');
    expect(result?.completionPct).toBe(100);
    expect(result?.masteredSkills).toBe(2);
    expect(result?.gapSkills).toEqual([]);
  });

  it('getSkillGapAnalysis() returns null when path not found', async () => {
    const mockWhereEmpty = vi.fn().mockResolvedValueOnce([]);
    const mockLimitEmpty = vi.fn(() => ({ offset: mockOffset }));
    const mockFromEmpty = vi.fn(() => ({
      where: mockWhereEmpty,
      limit: mockLimitEmpty,
    }));
    mockSelect.mockReturnValueOnce({ from: mockFromEmpty });
    mockOffset.mockResolvedValueOnce([]);

    const result = await service.getSkillGapAnalysis(mockAuth, 'unknown-path');
    expect(result).toBeNull();
  });

  it('onModuleDestroy() calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});

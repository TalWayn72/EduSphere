import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock @edusphere/db ───────────────────────────────────────────────────────

const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  skills: { id: 'id', name: 'name' },
  inArray: vi.fn((col: unknown, vals: unknown[]) => ({ col, vals })),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { SkillGapService } from './skill-gap.service';
import type { AuthContext } from '@edusphere/auth';

// ── Test helpers ─────────────────────────────────────────────────────────────

const authContext: AuthContext = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
};

function buildService(): SkillGapService {
  return new SkillGapService();
}

function mockListSkillPaths(paths: Array<{ id: string; skillIds: string[] }>) {
  return vi.fn().mockResolvedValue(paths);
}

function mockGetMyProgress(
  progress: Array<{ skillId: string; masteryLevel: string }>
) {
  return vi.fn().mockResolvedValue(progress);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SkillGapService', () => {
  let service: SkillGapService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('getSkillGapAnalysis', () => {
    it('returns null when pathId is not found', async () => {
      const listPaths = mockListSkillPaths([]);
      const getProgress = mockGetMyProgress([]);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'nonexistent-path',
        listPaths,
        getProgress
      );

      expect(result).toBeNull();
    });

    it('returns 100% completion when all skills are mastered', async () => {
      const listPaths = mockListSkillPaths([
        { id: 'path-1', skillIds: ['sk-1', 'sk-2'] },
      ]);
      const getProgress = mockGetMyProgress([
        { skillId: 'sk-1', masteryLevel: 'MASTERED' },
        { skillId: 'sk-2', masteryLevel: 'PROFICIENT' },
      ]);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'path-1',
        listPaths,
        getProgress
      );

      expect(result).toBeDefined();
      expect(result!.totalSkills).toBe(2);
      expect(result!.masteredSkills).toBe(2);
      expect(result!.completionPct).toBe(100);
      expect(result!.gapSkills).toEqual([]);
    });

    it('identifies gap skills that are not mastered', async () => {
      const listPaths = mockListSkillPaths([
        { id: 'path-1', skillIds: ['sk-1', 'sk-2', 'sk-3'] },
      ]);
      const getProgress = mockGetMyProgress([
        { skillId: 'sk-1', masteryLevel: 'MASTERED' },
        { skillId: 'sk-2', masteryLevel: 'BEGINNER' },
        { skillId: 'sk-3', masteryLevel: 'NOVICE' },
      ]);

      const gapSkillRows = [
        { id: 'sk-2', name: 'React Hooks' },
        { id: 'sk-3', name: 'State Management' },
      ];
      mockSelectWhere.mockResolvedValueOnce(gapSkillRows);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'path-1',
        listPaths,
        getProgress
      );

      expect(result!.totalSkills).toBe(3);
      expect(result!.masteredSkills).toBe(1);
      expect(result!.gapSkills).toEqual(gapSkillRows);
      expect(result!.completionPct).toBeCloseTo(33.33, 1);
    });

    it('returns 0% completion when no skills are mastered', async () => {
      const listPaths = mockListSkillPaths([
        { id: 'path-1', skillIds: ['sk-1', 'sk-2'] },
      ]);
      const getProgress = mockGetMyProgress([]);
      mockSelectWhere.mockResolvedValueOnce([
        { id: 'sk-1', name: 'Skill A' },
        { id: 'sk-2', name: 'Skill B' },
      ]);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'path-1',
        listPaths,
        getProgress
      );

      expect(result!.completionPct).toBe(0);
      expect(result!.masteredSkills).toBe(0);
      expect(result!.gapSkills).toHaveLength(2);
    });

    it('handles path with empty skillIds', async () => {
      const listPaths = mockListSkillPaths([
        { id: 'path-empty', skillIds: [] },
      ]);
      const getProgress = mockGetMyProgress([]);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'path-empty',
        listPaths,
        getProgress
      );

      expect(result!.totalSkills).toBe(0);
      expect(result!.completionPct).toBe(0);
      expect(result!.gapSkills).toEqual([]);
    });

    it('treats PROFICIENT as mastered', async () => {
      const listPaths = mockListSkillPaths([
        { id: 'path-1', skillIds: ['sk-1'] },
      ]);
      const getProgress = mockGetMyProgress([
        { skillId: 'sk-1', masteryLevel: 'PROFICIENT' },
      ]);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'path-1',
        listPaths,
        getProgress
      );

      expect(result!.masteredSkills).toBe(1);
      expect(result!.completionPct).toBe(100);
    });

    it('ignores skills not in the path skillIds', async () => {
      const listPaths = mockListSkillPaths([
        { id: 'path-1', skillIds: ['sk-1'] },
      ]);
      const getProgress = mockGetMyProgress([
        { skillId: 'sk-1', masteryLevel: 'BEGINNER' },
        { skillId: 'sk-99', masteryLevel: 'MASTERED' }, // not in path
      ]);
      mockSelectWhere.mockResolvedValueOnce([{ id: 'sk-1', name: 'Skill 1' }]);

      const result = await service.getSkillGapAnalysis(
        authContext,
        'path-1',
        listPaths,
        getProgress
      );

      expect(result!.masteredSkills).toBe(0);
      expect(result!.gapSkills).toHaveLength(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});

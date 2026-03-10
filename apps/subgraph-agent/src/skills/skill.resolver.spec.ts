import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Hoisted mocks (vi.hoisted prevents TDZ when vi.mock factories reference these) ──
const mockListSkills = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockGetSkill = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockListSkillPaths = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockGetMySkillProgress = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockCreateSkillPath = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'path-1' }));
const mockUpdateMySkillProgress = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ skillId: 'skill-1', masteryLevel: 'PROFICIENT' })
);
const mockGetSkillPrerequisites = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockGetSkillGapAnalysis = vi.hoisted(() => vi.fn().mockResolvedValue(null));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('./skill.service', () => {
  class SkillService {
    listSkills = mockListSkills;
    getSkill = mockGetSkill;
    listSkillPaths = mockListSkillPaths;
    getMySkillProgress = mockGetMySkillProgress;
    createSkillPath = mockCreateSkillPath;
    updateMySkillProgress = mockUpdateMySkillProgress;
    getSkillPrerequisites = mockGetSkillPrerequisites;
  }
  return { SkillService };
});

vi.mock('./skill-gap.service', () => {
  class SkillGapService {
    getSkillGapAnalysis = mockGetSkillGapAnalysis;
  }
  return { SkillGapService };
});

// ── Import after mocks ────────────────────────────────────────────────────────

import { SkillResolver } from './skill.resolver';
import { SkillService } from './skill.service';
import { SkillGapService } from './skill-gap.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockAuthContext = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['STUDENT' as const],
  email: 'user@example.com',
  username: 'user1',
  scopes: [],
  isSuperAdmin: false,
};

function buildContext(withAuth = true) {
  return withAuth ? { authContext: mockAuthContext } : {};
}

function buildResolver() {
  const service = new SkillService();
  const gapService = new SkillGapService();
  return new SkillResolver(service, gapService);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SkillResolver', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = buildResolver();
  });

  describe('skills query', () => {
    it('calls listSkills with args', async () => {
      mockListSkills.mockResolvedValueOnce([{ id: 'skill-1' }]);
      const result = await resolver.listSkills('programming', 10, 0);
      expect(mockListSkills).toHaveBeenCalledWith('programming', 10, 0);
      expect(result).toEqual([{ id: 'skill-1' }]);
    });

    it('calls listSkills with no args', async () => {
      await resolver.listSkills(undefined, undefined, undefined);
      expect(mockListSkills).toHaveBeenCalledWith(undefined, undefined, undefined);
    });
  });

  describe('skill query', () => {
    it('calls getSkill with id', async () => {
      mockGetSkill.mockResolvedValueOnce({ id: 'skill-1', name: 'TypeScript' });
      const result = await resolver.getSkill('skill-1');
      expect(mockGetSkill).toHaveBeenCalledWith('skill-1');
      expect(result).toEqual({ id: 'skill-1', name: 'TypeScript' });
    });
  });

  describe('skillPaths query', () => {
    it('calls listSkillPaths with auth context', async () => {
      mockListSkillPaths.mockResolvedValueOnce([{ id: 'path-1' }]);
      const result = await resolver.listSkillPaths(buildContext(), 5, 0);
      expect(mockListSkillPaths).toHaveBeenCalledWith(mockAuthContext, 5, 0);
      expect(result).toEqual([{ id: 'path-1' }]);
    });

    it('throws UnauthorizedException when no authContext', async () => {
      await expect(
        resolver.listSkillPaths(buildContext(false), 5, 0)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('mySkillProgress query', () => {
    it('calls getMySkillProgress with auth context', async () => {
      const progress = [{ skillId: 'skill-1', masteryLevel: 'MASTERED' }];
      mockGetMySkillProgress.mockResolvedValueOnce(progress);
      const result = await resolver.mySkillProgress(buildContext());
      expect(mockGetMySkillProgress).toHaveBeenCalledWith(mockAuthContext);
      expect(result).toEqual(progress);
    });
  });

  describe('skillGapAnalysis query', () => {
    it('returns analysis for valid pathId', async () => {
      const analysis = {
        targetPathId: 'path-1',
        totalSkills: 3,
        masteredSkills: 2,
        gapSkills: [],
        completionPct: 66.66,
      };
      mockGetSkillGapAnalysis.mockResolvedValueOnce(analysis);
      const result = await resolver.skillGapAnalysis('path-1', buildContext());
      expect(result).toEqual(analysis);
      expect(mockGetSkillGapAnalysis).toHaveBeenCalledWith(
        mockAuthContext,
        'path-1',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('throws when path not found', async () => {
      mockGetSkillGapAnalysis.mockResolvedValueOnce(null);
      await expect(
        resolver.skillGapAnalysis('bad-path', buildContext())
      ).rejects.toThrow('SkillPath bad-path not found');
    });
  });

  describe('createSkillPath mutation', () => {
    it('calls createSkillPath with auth context and input', async () => {
      const input = { title: 'React Path', skillIds: ['skill-1'] };
      mockCreateSkillPath.mockResolvedValueOnce({ id: 'path-new', ...input });
      const result = await resolver.createSkillPath(input, buildContext());
      expect(mockCreateSkillPath).toHaveBeenCalledWith(mockAuthContext, input);
      expect(result).toMatchObject({ title: 'React Path' });
    });
  });

  describe('updateMySkillProgress mutation', () => {
    it('calls service with skillId and masteryLevel', async () => {
      await resolver.updateMySkillProgress(
        'skill-1',
        'MASTERED',
        buildContext()
      );
      expect(mockUpdateMySkillProgress).toHaveBeenCalledWith(
        mockAuthContext,
        'skill-1',
        'MASTERED'
      );
    });
  });

  describe('prerequisites field resolver', () => {
    it('calls getSkillPrerequisites with skill.id', async () => {
      const prereqs = [{ id: 'skill-0', name: 'JavaScript' }];
      mockGetSkillPrerequisites.mockResolvedValueOnce(prereqs);
      const skill = {
        id: 'skill-1',
        slug: 'typescript',
        name: 'TypeScript',
        category: 'programming',
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await resolver.prerequisites(skill);
      expect(mockGetSkillPrerequisites).toHaveBeenCalledWith('skill-1');
      expect(result).toEqual(prereqs);
    });
  });
});

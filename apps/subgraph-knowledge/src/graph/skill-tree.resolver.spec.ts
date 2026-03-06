/**
 * SkillTreeResolver unit tests — uses direct instantiation pattern (same as skill-gap.resolver.spec.ts)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── SkillTreeService mock ─────────────────────────────────────────────────────
const mockGetSkillTree = vi.fn();
const mockUpdateMasteryLevel = vi.fn();

vi.mock('./skill-tree.service', () => ({
  SkillTreeService: class {
    getSkillTree = mockGetSkillTree;
    updateMasteryLevel = mockUpdateMasteryLevel;
  },
}));

import { SkillTreeResolver } from './skill-tree.resolver.js';
import { SkillTreeService } from './skill-tree.service.js';

function makeCtx(
  overrides: Partial<{ userId: string; tenantId: string; roles: string[] }> = {}
) {
  return {
    authContext: {
      userId: overrides.userId ?? 'user-1',
      tenantId: overrides.tenantId ?? 'tenant-1',
      roles: overrides.roles ?? ['STUDENT'],
    },
  };
}

describe('SkillTreeResolver', () => {
  let resolver: SkillTreeResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new SkillTreeResolver(new SkillTreeService());
  });

  describe('skillTree()', () => {
    it('delegates to skillTreeService.getSkillTree', async () => {
      const expected = { nodes: [], edges: [] };
      mockGetSkillTree.mockResolvedValue(expected);

      const result = await resolver.skillTree('course-1', makeCtx());

      expect(mockGetSkillTree).toHaveBeenCalledWith(
        'course-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(expected);
    });

    it('throws UnauthorizedException when userId missing', async () => {
      const ctx = {
        authContext: { userId: null, tenantId: 'tenant-1', roles: ['STUDENT'] },
      };
      await expect(
        resolver.skillTree('course-1', ctx as never)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authContext missing', async () => {
      await expect(
        resolver.skillTree('course-1', {} as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateMasteryLevel()', () => {
    it('delegates to skillTreeService.updateMasteryLevel with valid level', async () => {
      const expected = {
        id: 'node-1',
        label: 'React',
        masteryLevel: 'PROFICIENT',
        type: 'CONCEPT',
        connections: [],
      };
      mockUpdateMasteryLevel.mockResolvedValue(expected);

      const result = await resolver.updateMasteryLevel(
        'node-1',
        'PROFICIENT',
        makeCtx()
      );

      expect(mockUpdateMasteryLevel).toHaveBeenCalledWith(
        'node-1',
        'PROFICIENT',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(expected);
    });

    it('coerces unknown mastery level to NONE', async () => {
      const expected = {
        id: 'node-1',
        label: 'React',
        masteryLevel: 'NONE',
        type: 'CONCEPT',
        connections: [],
      };
      mockUpdateMasteryLevel.mockResolvedValue(expected);

      await resolver.updateMasteryLevel('node-1', 'INVALID_LEVEL', makeCtx());

      expect(mockUpdateMasteryLevel).toHaveBeenCalledWith(
        'node-1',
        'NONE',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });

    it('throws UnauthorizedException when authContext missing', async () => {
      await expect(
        resolver.updateMasteryLevel('node-1', 'PROFICIENT', {} as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

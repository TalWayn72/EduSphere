import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── SkillGapService mock ─────────────────────────────────────────────────────
const mockAnalyzeSkillGap = vi.fn();
const mockListSkillProfiles = vi.fn();
const mockCreateSkillProfile = vi.fn();

vi.mock('./skill-gap.service', () => ({
  SkillGapService: class {
    analyzeSkillGap = mockAnalyzeSkillGap;
    listSkillProfiles = mockListSkillProfiles;
    createSkillProfile = mockCreateSkillProfile;
  },
}));

import { SkillGapResolver } from './skill-gap.resolver.js';
import { SkillGapService } from './skill-gap.service.js';

const makeCtx = (
  overrides: Partial<{ userId: string; tenantId: string; roles: string[] }> = {}
) => ({
  authContext: {
    userId: overrides.userId ?? 'user-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    roles: overrides.roles ?? ['STUDENT'],
  },
});

describe('SkillGapResolver', () => {
  let resolver: SkillGapResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new SkillGapResolver(new SkillGapService({} as never, {} as never));
  });

  describe('skillGapAnalysis()', () => {
    it('delegates to skillGapService.analyzeSkillGap', async () => {
      const mockResult = { gaps: [], masteredConcepts: [] };
      mockAnalyzeSkillGap.mockResolvedValue(mockResult);

      const result = await resolver.skillGapAnalysis('role-1', makeCtx());

      expect(mockAnalyzeSkillGap).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        'STUDENT',
        'role-1'
      );
      expect(result).toEqual(mockResult);
    });

    it('throws UnauthorizedException when userId missing', async () => {
      const ctx = {
        authContext: { userId: null, tenantId: 'tenant-1', roles: ['STUDENT'] },
      };
      await expect(
        resolver.skillGapAnalysis('role-1', ctx as never)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authContext missing', async () => {
      await expect(
        resolver.skillGapAnalysis('role-1', {} as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('skillProfiles()', () => {
    it('delegates to skillGapService.listSkillProfiles', async () => {
      const profiles = [{ id: 'sp-1', roleName: 'Frontend Dev' }];
      mockListSkillProfiles.mockResolvedValue(profiles);

      const result = await resolver.skillProfiles(makeCtx());

      expect(mockListSkillProfiles).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(profiles);
    });
  });

  describe('createSkillProfile()', () => {
    it('delegates to skillGapService.createSkillProfile', async () => {
      const profile = { id: 'sp-2', roleName: 'Backend Dev' };
      mockCreateSkillProfile.mockResolvedValue(profile);

      const result = await resolver.createSkillProfile(
        'Backend Dev',
        'Node.js expert',
        ['Node.js', 'PostgreSQL'],
        makeCtx()
      );

      expect(mockCreateSkillProfile).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'STUDENT',
        'Backend Dev',
        'Node.js expert',
        ['Node.js', 'PostgreSQL']
      );
      expect(result).toEqual(profile);
    });

    it('passes null description when null is passed', async () => {
      mockCreateSkillProfile.mockResolvedValue({});
      await resolver.createSkillProfile('Role', null, [], makeCtx());
      expect(mockCreateSkillProfile).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'STUDENT',
        'Role',
        null,
        []
      );
    });
  });
});

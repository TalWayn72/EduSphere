/**
 * Unit tests for SkillGapService (F-006).
 * All DB calls are mocked -- no real database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SkillGapService } from './skill-gap.service';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockExecute = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  execute: mockExecute,
};

vi.mock('@edusphere/db', () => ({
  db: { execute: vi.fn() },
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => unknown) =>
      cb(mockTx)
  ),
  skillProfiles: {
    id: 'id',
    tenantId: 'tenant_id',
    roleName: 'role_name',
    requiredConcepts: 'required_concepts',
    createdAt: 'created_at',
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn((...args: unknown[]) => args),
}));

const mockRecommendations = {
  buildGapItems: vi.fn(),
};

function makeService() {
  return new SkillGapService(mockRecommendations as never);
}

const PROFILE = {
  id: 'profile-1',
  roleName: 'Backend Engineer',
  description: null,
  requiredConcepts: ['GraphQL', 'Docker', 'PostgreSQL'],
  tenantId: 'tenant-1',
  createdBy: 'user-1',
  createdAt: new Date(),
};

const TENANT = 'tenant-1';
const USER = 'user-1';
const ROLE = 'STUDENT';

function setupProfileQuery(profile: typeof PROFILE | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(profile ? [profile] : []),
  });
}

describe('SkillGapService', () => {
  let service: SkillGapService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = makeService();
  });

  describe('analyzeSkillGap', () => {
    it('returns gapCount=0 and 100% when all concepts are mastered', async () => {
      setupProfileQuery(PROFILE);
      mockExecute.mockResolvedValueOnce({
        rows: [
          { concept_name: 'graphql' },
          { concept_name: 'docker' },
          { concept_name: 'postgresql' },
        ],
      });
      mockRecommendations.buildGapItems.mockResolvedValue([]);

      const report = await service.analyzeSkillGap(
        USER,
        TENANT,
        ROLE,
        'profile-1'
      );

      expect(report.gapCount).toBe(0);
      expect(report.completionPercentage).toBe(100);
      expect(report.mastered).toBe(3);
      expect(report.gaps).toHaveLength(0);
    });

    it('returns gapCount=totalRequired when no concepts mastered', async () => {
      setupProfileQuery(PROFILE);
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockRecommendations.buildGapItems.mockResolvedValue([
        {
          conceptName: 'GraphQL',
          isMastered: false,
          recommendedContentItems: [],
          recommendedContentTitles: [],
          relevanceScore: 0,
        },
        {
          conceptName: 'Docker',
          isMastered: false,
          recommendedContentItems: [],
          recommendedContentTitles: [],
          relevanceScore: 0,
        },
        {
          conceptName: 'PostgreSQL',
          isMastered: false,
          recommendedContentItems: [],
          recommendedContentTitles: [],
          relevanceScore: 0,
        },
      ]);

      const report = await service.analyzeSkillGap(
        USER,
        TENANT,
        ROLE,
        'profile-1'
      );

      expect(report.gapCount).toBe(3);
      expect(report.mastered).toBe(0);
      expect(report.completionPercentage).toBe(0);
    });

    it('computes correct percentages for partial mastery (1 of 3)', async () => {
      setupProfileQuery(PROFILE);
      mockExecute.mockResolvedValueOnce({
        rows: [{ concept_name: 'graphql' }],
      });
      mockRecommendations.buildGapItems.mockResolvedValue([
        {
          conceptName: 'Docker',
          isMastered: false,
          recommendedContentItems: [],
          recommendedContentTitles: [],
          relevanceScore: 0,
        },
        {
          conceptName: 'PostgreSQL',
          isMastered: false,
          recommendedContentItems: [],
          recommendedContentTitles: [],
          relevanceScore: 0,
        },
      ]);

      const report = await service.analyzeSkillGap(
        USER,
        TENANT,
        ROLE,
        'profile-1'
      );

      expect(report.mastered).toBe(1);
      expect(report.gapCount).toBe(2);
      expect(report.completionPercentage).toBe(33);
    });

    it('throws NotFoundException when profile does not exist', async () => {
      setupProfileQuery(null);

      await expect(
        service.analyzeSkillGap(USER, TENANT, ROLE, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });

    it('attaches recommended content from recommendations service', async () => {
      setupProfileQuery(PROFILE);
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockRecommendations.buildGapItems.mockResolvedValue([
        {
          conceptName: 'GraphQL',
          isMastered: false,
          recommendedContentItems: ['seg-1'],
          recommendedContentTitles: ['GraphQL Course'],
          relevanceScore: 0.9,
        },
      ]);

      const report = await service.analyzeSkillGap(
        USER,
        TENANT,
        ROLE,
        'profile-1'
      );

      expect(report.gaps[0]?.recommendedContentItems).toContain('seg-1');
      expect(report.gaps[0]?.recommendedContentTitles).toContain(
        'GraphQL Course'
      );
    });

    it('returns 100% when profile has zero required concepts', async () => {
      const emptyProfile = { ...PROFILE, requiredConcepts: [] };
      setupProfileQuery(emptyProfile);
      mockExecute.mockResolvedValueOnce({ rows: [] });
      mockRecommendations.buildGapItems.mockResolvedValue([]);

      const report = await service.analyzeSkillGap(
        USER,
        TENANT,
        ROLE,
        'profile-1'
      );

      expect(report.completionPercentage).toBe(100);
      expect(report.totalRequired).toBe(0);
    });
  });

  describe('createSkillProfile', () => {
    it('inserts and returns the new profile DTO', async () => {
      const insertedRow = { ...PROFILE, requiredConcepts: ['GraphQL'] };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([insertedRow]),
      });

      const dto = await service.createSkillProfile(
        TENANT,
        USER,
        'INSTRUCTOR',
        'Backend Engineer',
        null,
        ['GraphQL']
      );

      expect(dto.roleName).toBe('Backend Engineer');
      expect(dto.requiredConceptsCount).toBe(1);
      expect(dto.id).toBe('profile-1');
    });
  });

  describe('listSkillProfiles', () => {
    it('returns profiles belonging to the tenant', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([PROFILE]),
      });

      const profiles = await service.listSkillProfiles(TENANT, USER, ROLE);

      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.roleName).toBe('Backend Engineer');
      expect(profiles[0]?.requiredConceptsCount).toBe(3);
    });

    it('returns empty array when no profiles exist', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      });

      const profiles = await service.listSkillProfiles(TENANT, USER, ROLE);
      expect(profiles).toHaveLength(0);
    });
  });
});

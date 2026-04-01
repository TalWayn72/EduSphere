import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamAssemblyService } from './exam-assembly.service';
import { BadRequestException } from '@nestjs/common';

// Mock dependencies
vi.mock('@edusphere/db', () => ({
  closeAllPools: vi.fn(),
}));

function makeItem(
  id: string,
  domain: string,
  bloom: string,
  status: string,
  irtB = 0,
  difFlagged = false
) {
  return {
    id,
    domainTag: domain,
    bloomLevel: bloom,
    calibrationStatus: status,
    irtA: 1,
    irtB,
    irtC: 0.2,
    difFlagged,
    tenantId: 't1',
    courseId: 'c1',
    questionData: {},
    source: 'MANUAL',
    exposureCount: 0,
    createdBy: 'u1',
    moduleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function makeBlueprint(overrides = {}) {
  return {
    id: 'bp-1',
    courseId: 'c1',
    totalQuestions: 4,
    domainDistribution: { algebra: 50, geometry: 50 },
    bloomDistribution: { REMEMBER: 50, APPLY: 50 },
    difficultyRange: null,
    passingScore: 600,
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('ExamAssemblyService', () => {
  let service: ExamAssemblyService;
  let mockItemService: { getAssemblableItems: ReturnType<typeof vi.fn> };
  let mockBlueprintService: { getBlueprint: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockItemService = { getAssemblableItems: vi.fn() };
    mockBlueprintService = { getBlueprint: vi.fn() };
    service = new ExamAssemblyService(
      mockItemService as never,
      mockBlueprintService as never
    );
  });

  describe('assembleExam', () => {
    it('assembles exam with simple blueprint (single domain)', async () => {
      const bp = makeBlueprint({
        totalQuestions: 3,
        domainDistribution: { algebra: 100 },
        bloomDistribution: {},
      });
      const items = [
        makeItem('i1', 'algebra', 'REMEMBER', 'CALIBRATED'),
        makeItem('i2', 'algebra', 'APPLY', 'CALIBRATED'),
        makeItem('i3', 'algebra', 'ANALYZE', 'PILOT'),
        makeItem('i4', 'algebra', 'REMEMBER', 'CALIBRATED'),
      ];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      const result = await service.assembleExam('bp-1', 'u1', 't1');
      expect(result.questionOrder).toHaveLength(3);
      expect(Object.keys(result.optionShuffleSeeds)).toHaveLength(3);
    });

    it('respects domain distribution weights', async () => {
      const bp = makeBlueprint({
        totalQuestions: 4,
        domainDistribution: { algebra: 50, geometry: 50 },
        bloomDistribution: {},
      });
      const items = [
        makeItem('a1', 'algebra', 'REMEMBER', 'CALIBRATED'),
        makeItem('a2', 'algebra', 'APPLY', 'CALIBRATED'),
        makeItem('a3', 'algebra', 'ANALYZE', 'CALIBRATED'),
        makeItem('g1', 'geometry', 'REMEMBER', 'CALIBRATED'),
        makeItem('g2', 'geometry', 'APPLY', 'CALIBRATED'),
        makeItem('g3', 'geometry', 'ANALYZE', 'CALIBRATED'),
      ];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      const result = await service.assembleExam('bp-1', 'u1', 't1');
      expect(result.questionOrder).toHaveLength(4);
      const algebras = result.questionOrder.filter((id) => id.startsWith('a'));
      const geoms = result.questionOrder.filter((id) => id.startsWith('g'));
      expect(algebras).toHaveLength(2);
      expect(geoms).toHaveLength(2);
    });

    it('excludes RETIRED items', async () => {
      const bp = makeBlueprint({
        totalQuestions: 2,
        domainDistribution: { algebra: 100 },
        bloomDistribution: {},
      });
      const items = [
        makeItem('i1', 'algebra', 'REMEMBER', 'RETIRED'),
        makeItem('i2', 'algebra', 'APPLY', 'CALIBRATED'),
        makeItem('i3', 'algebra', 'ANALYZE', 'CALIBRATED'),
      ];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      const result = await service.assembleExam('bp-1', 'u1', 't1');
      expect(result.questionOrder).not.toContain('i1');
      expect(result.questionOrder).toHaveLength(2);
    });

    it('throws if insufficient items per domain', async () => {
      const bp = makeBlueprint({
        totalQuestions: 10,
        domainDistribution: { algebra: 100 },
        bloomDistribution: {},
      });
      const items = [
        makeItem('i1', 'algebra', 'REMEMBER', 'CALIBRATED'),
        makeItem('i2', 'algebra', 'APPLY', 'CALIBRATED'),
      ];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      await expect(service.assembleExam('bp-1', 'u1', 't1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('generates unique option shuffle seeds per item', async () => {
      const bp = makeBlueprint({
        totalQuestions: 3,
        domainDistribution: { math: 100 },
        bloomDistribution: {},
      });
      const items = [
        makeItem('i1', 'math', 'REMEMBER', 'CALIBRATED'),
        makeItem('i2', 'math', 'APPLY', 'CALIBRATED'),
        makeItem('i3', 'math', 'ANALYZE', 'CALIBRATED'),
      ];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      const result = await service.assembleExam('bp-1', 'u1', 't1');
      const seeds = Object.values(result.optionShuffleSeeds);
      expect(seeds).toHaveLength(3);
      seeds.forEach((s) => {
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThan(2147483647);
      });
    });
  });

  describe('validateBlueprintCanAssemble', () => {
    it('returns valid when sufficient items exist', async () => {
      const bp = makeBlueprint({
        totalQuestions: 2,
        domainDistribution: { algebra: 100 },
      });
      const items = [
        makeItem('i1', 'algebra', 'REMEMBER', 'CALIBRATED'),
        makeItem('i2', 'algebra', 'APPLY', 'CALIBRATED'),
        makeItem('i3', 'algebra', 'ANALYZE', 'CALIBRATED'),
      ];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      const result = await service.validateBlueprintCanAssemble(
        'bp-1',
        't1',
        'u1'
      );
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('returns issues for insufficient items', async () => {
      const bp = makeBlueprint({
        totalQuestions: 10,
        domainDistribution: { algebra: 50, geometry: 50 },
      });
      const items = [makeItem('i1', 'algebra', 'REMEMBER', 'CALIBRATED')];
      mockBlueprintService.getBlueprint.mockResolvedValue(bp);
      mockItemService.getAssemblableItems.mockResolvedValue(items);

      const result = await service.validateBlueprintCanAssemble(
        'bp-1',
        't1',
        'u1'
      );
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});

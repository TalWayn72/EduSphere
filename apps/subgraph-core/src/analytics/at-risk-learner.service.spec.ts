/**
 * Unit tests for AtRiskLearnerService — at-risk detection algorithm edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtRiskLearnerService } from './at-risk-learner.service';

// Mock @edusphere/db
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    execute: vi.fn(),
  })),
  closeAllPools: vi.fn(),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      })
  ),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

describe('AtRiskLearnerService', () => {
  let service: AtRiskLearnerService;

  const mockCtx = {
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: 'user-1',
    userRole: 'ORG_ADMIN' as const,
  };

  beforeEach(() => {
    service = new AtRiskLearnerService();
  });

  describe('computeRiskLevel (via getAtRiskLearners)', () => {
    it('should return HIGH when 2+ criteria are met', () => {
      // Access private method via prototype
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      expect(computeRiskLevel(2, 30, 10, null)).toBe('HIGH');
      expect(computeRiskLevel(3, 20, 5, null)).toBe('HIGH');
    });

    it('should return MEDIUM when exactly 1 criteria is met', () => {
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      expect(computeRiskLevel(1, 60, 30, new Date())).toBe('MEDIUM');
    });

    it('should return LOW when borderline (within 20% of threshold)', () => {
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      // Quiz pass rate between 50% and 60% (within 20% of 50 threshold)
      expect(computeRiskLevel(0, 55, 30, new Date())).toBe('LOW');

      // Completion rate between 20% and 24% (within 20% of 20 threshold)
      expect(computeRiskLevel(0, 70, 22, new Date())).toBe('LOW');
    });

    it('should handle exactly 14 days inactive threshold', () => {
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      // Exactly 14 days ago - should count as 1 criteria met
      expect(
        computeRiskLevel(
          1,
          70,
          50,
          new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        )
      ).toBe('MEDIUM');
    });

    it('should handle exactly 50% quiz pass rate threshold', () => {
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      // Exactly at 50% - borderline case
      expect(computeRiskLevel(0, 50, 30, new Date())).toBe('LOW');
    });

    it('should handle exactly 20% completion rate threshold', () => {
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      // Exactly at 20% - borderline case
      expect(computeRiskLevel(0, 70, 20, new Date())).toBe('LOW');
    });

    it('should handle null lastActive as inactive', () => {
      const computeRiskLevel = (
        service as unknown as {
          computeRiskLevel: (
            criteriaMet: number,
            quizPassRate: number,
            completionRate: number,
            lastActive: Date | null
          ) => string;
        }
      ).computeRiskLevel.bind(service);

      // null lastActive with 1 criteria = MEDIUM
      expect(computeRiskLevel(1, 70, 30, null)).toBe('MEDIUM');
    });
  });

  describe('getAtRiskLearners', () => {
    it('should return empty array when no at-risk learners', async () => {
      const result = await service.getAtRiskLearners(mockCtx, 20, 0);
      expect(result).toEqual([]);
    });

    it('should accept default limit and offset', async () => {
      const result = await service.getAtRiskLearners(mockCtx);
      expect(result).toEqual([]);
    });
  });

  describe('getLearnerDetail', () => {
    it('should return null when learner not found', async () => {
      const result = await service.getLearnerDetail(mockCtx, 'non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});

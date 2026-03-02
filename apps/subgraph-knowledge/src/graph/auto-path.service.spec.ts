import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockTxExecute = vi.fn();
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({ execute: mockTxExecute })
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  sql: vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
}));

// ─── CypherLearningPathService mock ───────────────────────────────────────────
const mockFindShortestLearningPath = vi.fn();
const mockFindPrerequisiteChain = vi.fn();

vi.mock('./cypher-learning-path.service', () => ({
  CypherLearningPathService: class {
    findShortestLearningPath = mockFindShortestLearningPath;
    findPrerequisiteChain = mockFindPrerequisiteChain;
  },
}));

import { AutoPathService } from './auto-path.service.js';
import { CypherLearningPathService } from './cypher-learning-path.service.js';

describe('AutoPathService', () => {
  let service: AutoPathService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AutoPathService(new CypherLearningPathService({} as never));
  });

  describe('getMyLearningPath()', () => {
    it('returns AutoPath when mastered concepts exist and path is found', async () => {
      mockTxExecute.mockResolvedValue({
        rows: [{ concept_name: 'Algebra' }],
      });
      mockFindShortestLearningPath.mockResolvedValue({
        concepts: [
          { name: 'Algebra' },
          { name: 'Calculus' },
          { name: 'LinearAlgebra' },
        ],
        steps: 2,
      });

      const result = await service.getMyLearningPath(
        'LinearAlgebra',
        'user-1',
        'tenant-1',
        'STUDENT'
      );

      expect(result).not.toBeNull();
      expect(result!.targetConceptName).toBe('LinearAlgebra');
      expect(result!.nodes).toHaveLength(3);
      expect(result!.totalSteps).toBe(3);
    });

    it('marks completed steps for mastered concepts', async () => {
      mockTxExecute.mockResolvedValue({
        rows: [{ concept_name: 'Algebra' }],
      });
      mockFindShortestLearningPath.mockResolvedValue({
        concepts: [{ name: 'Algebra' }, { name: 'Calculus' }],
        steps: 1,
      });

      const result = await service.getMyLearningPath(
        'Calculus',
        'user-1',
        'tenant-1',
        'STUDENT'
      );

      expect(result!.completedSteps).toBe(1);
      const masteredNode = result!.nodes.find(
        (n) => n.conceptName === 'Algebra'
      );
      expect(masteredNode!.isCompleted).toBe(true);
    });

    it('falls back to prerequisite chain when no mastered concepts', async () => {
      mockTxExecute.mockResolvedValue({ rows: [] });
      mockFindShortestLearningPath.mockResolvedValue(null);
      mockFindPrerequisiteChain.mockResolvedValue([
        { name: 'Sets' },
        { name: 'Functions' },
        { name: 'Calculus' },
      ]);

      const result = await service.getMyLearningPath(
        'Calculus',
        'user-1',
        'tenant-1',
        'STUDENT'
      );

      expect(result).not.toBeNull();
      expect(result!.nodes.map((n) => n.conceptName)).toEqual([
        'Sets',
        'Functions',
        'Calculus',
      ]);
      expect(result!.completedSteps).toBe(0);
    });

    it('returns null when no path and no prerequisite chain', async () => {
      mockTxExecute.mockResolvedValue({ rows: [] });
      mockFindShortestLearningPath.mockResolvedValue(null);
      mockFindPrerequisiteChain.mockResolvedValue([]);

      const result = await service.getMyLearningPath(
        'Unknown',
        'user-1',
        'tenant-1',
        'STUDENT'
      );

      expect(result).toBeNull();
    });

    it('selects the shortest path from multiple mastered concepts', async () => {
      mockTxExecute.mockResolvedValue({
        rows: [{ concept_name: 'ConceptA' }, { concept_name: 'ConceptB' }],
      });
      mockFindShortestLearningPath
        .mockResolvedValueOnce({
          concepts: [{ name: 'ConceptA' }, { name: 'Target' }],
          steps: 5,
        })
        .mockResolvedValueOnce({
          concepts: [{ name: 'ConceptB' }, { name: 'Target' }],
          steps: 2,
        });

      const result = await service.getMyLearningPath(
        'Target',
        'user-1',
        'tenant-1',
        'STUDENT'
      );

      expect(result!.nodes[0]!.conceptName).toBe('ConceptB');
    });

    it('sets all contentItems to empty arrays', async () => {
      mockTxExecute.mockResolvedValue({ rows: [] });
      mockFindShortestLearningPath.mockResolvedValue(null);
      mockFindPrerequisiteChain.mockResolvedValue([
        { name: 'A' },
        { name: 'B' },
      ]);

      const result = await service.getMyLearningPath(
        'B',
        'user-1',
        'tenant-1',
        'STUDENT'
      );

      expect(result!.nodes.every((n) => Array.isArray(n.contentItems))).toBe(
        true
      );
    });
  });
});

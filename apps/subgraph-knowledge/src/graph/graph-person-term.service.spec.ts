import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

// ─── Service dependency mocks ─────────────────────────────────────────────────
const mockPersonFindById = vi.fn();
const mockPersonFindByName = vi.fn();
const mockPersonCreate = vi.fn();
const mockTermFindById = vi.fn();
const mockTermFindByName = vi.fn();
const mockTermCreate = vi.fn();
const mockSourceFindById = vi.fn();
const mockSourceCreate = vi.fn();
const mockTopicFindById = vi.fn();
const mockTopicFindByCourse = vi.fn();
const mockTopicCreate = vi.fn();
const mockLearningPathFind = vi.fn();
const mockCollectRelated = vi.fn();
const mockPrerequisiteChain = vi.fn();

vi.mock('./cypher-person.service', () => ({
  CypherPersonService: class {
    findPersonById = mockPersonFindById;
    findPersonByName = mockPersonFindByName;
    createPerson = mockPersonCreate;
  },
}));
vi.mock('./cypher-term.service', () => ({
  CypherTermService: class {
    findTermById = mockTermFindById;
    findTermByName = mockTermFindByName;
    createTerm = mockTermCreate;
  },
}));
vi.mock('./cypher-source.service', () => ({
  CypherSourceService: class {
    findSourceById = mockSourceFindById;
    createSource = mockSourceCreate;
  },
}));
vi.mock('./cypher-topic-cluster.service', () => ({
  CypherTopicClusterService: class {
    findTopicClusterById = mockTopicFindById;
    findTopicClustersByCourse = mockTopicFindByCourse;
    createTopicCluster = mockTopicCreate;
  },
}));
vi.mock('./cypher-learning-path.service', () => ({
  CypherLearningPathService: class {
    findShortestLearningPath = mockLearningPathFind;
    collectRelatedConcepts = mockCollectRelated;
    findPrerequisiteChain = mockPrerequisiteChain;
  },
}));

import { GraphPersonTermService } from './graph-person-term.service.js';
import { CypherPersonService } from './cypher-person.service.js';
import { CypherTermService } from './cypher-term.service.js';
import { CypherSourceService } from './cypher-source.service.js';
import { CypherTopicClusterService } from './cypher-topic-cluster.service.js';
import { CypherLearningPathService } from './cypher-learning-path.service.js';

describe('GraphPersonTermService', () => {
  let service: GraphPersonTermService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphPersonTermService(
      new CypherPersonService({} as never),
      new CypherTermService({} as never),
      new CypherSourceService({} as never),
      new CypherTopicClusterService({} as never),
      new CypherLearningPathService({} as never)
    );
  });

  describe('findPersonById()', () => {
    it('delegates to person.findPersonById', async () => {
      mockPersonFindById.mockResolvedValue({ id: 'p-1', name: 'Alice' });
      const result = await service.findPersonById(
        'p-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockPersonFindById).toHaveBeenCalledWith('p-1', 'tenant-1');
      expect(result).toEqual({ id: 'p-1', name: 'Alice' });
    });
  });

  describe('createPerson()', () => {
    it('delegates to person.createPerson', async () => {
      mockPersonCreate.mockResolvedValue({ id: 'p-2', name: 'Bob' });
      const result = await service.createPerson(
        'Bob',
        null,
        'tenant-1',
        'user-1',
        'ORG_ADMIN'
      );
      expect(mockPersonCreate).toHaveBeenCalledWith('Bob', null, 'tenant-1');
      expect(result).toEqual({ id: 'p-2', name: 'Bob' });
    });
  });

  describe('findTermByName()', () => {
    it('delegates to term.findTermByName', async () => {
      mockTermFindByName.mockResolvedValue({ id: 't-1', name: 'Recursion' });
      const result = await service.findTermByName(
        'Recursion',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockTermFindByName).toHaveBeenCalledWith('Recursion', 'tenant-1');
      expect(result).toEqual({ id: 't-1', name: 'Recursion' });
    });
  });

  describe('createTerm()', () => {
    it('delegates to term.createTerm', async () => {
      mockTermCreate.mockResolvedValue({ id: 't-2' });
      const result = await service.createTerm(
        'Closure',
        'A function + scope',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(mockTermCreate).toHaveBeenCalledWith(
        'Closure',
        'A function + scope',
        'tenant-1'
      );
      expect(result).toEqual({ id: 't-2' });
    });
  });

  describe('createSource()', () => {
    it('delegates to source.createSource', async () => {
      mockSourceCreate.mockResolvedValue({ id: 's-1' });
      await service.createSource(
        'MDN',
        'URL',
        'https://mdn.io',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(mockSourceCreate).toHaveBeenCalledWith(
        'MDN',
        'URL',
        'https://mdn.io',
        'tenant-1'
      );
    });
  });

  describe('getLearningPath()', () => {
    it('delegates to learningPath.findShortestLearningPath', async () => {
      mockLearningPathFind.mockResolvedValue({
        concepts: [{ name: 'A' }, { name: 'B' }],
        steps: 1,
      });
      const result = await service.getLearningPath(
        'A',
        'B',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockLearningPathFind).toHaveBeenCalledWith('A', 'B', 'tenant-1');
      expect(result).toBeDefined();
    });
  });

  describe('getPrerequisiteChain()', () => {
    it('delegates to learningPath.findPrerequisiteChain', async () => {
      mockPrerequisiteChain.mockResolvedValue([
        { name: 'Algebra' },
        { name: 'Calculus' },
      ]);
      const result = await service.getPrerequisiteChain(
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockPrerequisiteChain).toHaveBeenCalledWith(
        'Calculus',
        'tenant-1'
      );
      expect(result).toHaveLength(2);
    });
  });
});

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

import { GraphPersonTermService } from './graph-person-term.service.js';
import { CypherPersonService } from './cypher-person.service.js';
import { CypherTermService } from './cypher-term.service.js';

// Source, TopicCluster, and LearningPath operations are tested in
// graph-source-cluster.service.spec.ts

describe('GraphPersonTermService', () => {
  let service: GraphPersonTermService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphPersonTermService(
      new CypherPersonService({} as never),
      new CypherTermService({} as never)
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
});

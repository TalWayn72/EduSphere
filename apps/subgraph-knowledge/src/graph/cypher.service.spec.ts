import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CypherService } from './cypher.service';
import { CypherConceptService } from './cypher-concept.service';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { CypherSourceService } from './cypher-source.service';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { CypherLearningPathService } from './cypher-learning-path.service';

// ─── Pool mock for direct pool.query calls (Learning Path methods) ────────────
//
// vi.mock() is hoisted to the top of the file before any `const` declarations,
// so we CANNOT reference outer `const` variables inside the factory.
// Instead we define the stubs using vi.hoisted() which executes in the hoisted scope.

const { mockRelease, mockClientQuery, mockPoolConnect } = vi.hoisted(() => {
  const mockRelease = vi.fn();
  const mockClientQuery = vi.fn().mockResolvedValue({ rows: [] });
  const mockPoolConnect = vi.fn().mockResolvedValue({
    query: mockClientQuery,
    release: mockRelease,
  });
  return { mockRelease, mockClientQuery, mockPoolConnect };
});

vi.mock('@edusphere/db', () => ({
  db: {
    $client: {
      connect: mockPoolConnect,
    },
  },
  executeCypher: vi.fn(),
  createConcept: vi.fn(),
  findRelatedConcepts: vi.fn(),
  createRelationship: vi.fn(),
}));

import {
  executeCypher,
  createConcept,
  findRelatedConcepts,
  createRelationship,
} from '@edusphere/db';

var RAW = {
  id: 'c-1',
  tenant_id: 't-1',
  name: 'Free Will',
  definition: 'Ability',
  source_ids: '[]',
};
var PERSON = {
  id: 'p-1',
  tenant_id: 't-1',
  name: 'Maimonides',
  bio: 'Philosopher',
};
var TERM = {
  id: 'term-1',
  tenant_id: 't-1',
  name: 'Torah',
  definition: 'Scriptures',
};
var SOURCE = {
  id: 'src-1',
  tenant_id: 't-1',
  title: 'Guide',
  type: 'BOOK',
  url: null,
};
var CLUSTER = {
  id: 'cl-1',
  tenant_id: 't-1',
  name: 'Cluster',
  description: null,
};
describe('CypherService', function () {
  var service;
  beforeEach(function () {
    vi.clearAllMocks();
    // Restore default implementations after clearAllMocks() wipes them
    mockClientQuery.mockResolvedValue({ rows: [] });
    mockPoolConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
    service = new CypherService(
      new CypherConceptService(),
      new CypherPersonService(),
      new CypherTermService(),
      new CypherSourceService(),
      new CypherTopicClusterService(),
      new CypherLearningPathService()
    );
  });

  describe('findConceptById', function () {
    it('returns concept when found', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      var result = await service.findConceptById('c-1', 't-1');
      expect(result).toEqual(RAW);
    });
    it('returns null when not found', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findConceptById('missing', 't-1')).toBeNull();
    });
    it('passes params to executeCypher', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      await service.findConceptById('c-1', 't-1');
      // executeCypher is called with 5 args: db, graphName, query, params, tenantId
      expect(executeCypher).toHaveBeenCalledWith(
        expect.anything(),
        'edusphere_graph',
        expect.any(String),
        { id: 'c-1', tenantId: 't-1' },
        't-1'
      );
    });
  });

  describe('findConceptByName', function () {
    it('returns concept when found', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      expect(await service.findConceptByName('Free Will', 't-1')).toEqual(RAW);
    });
    it('returns null when not found', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findConceptByName('X', 't-1')).toBeNull();
    });
  });

  describe('findConceptByNameCaseInsensitive', function () {
    it('finds concept matching case-insensitively', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      const result = await service.findConceptByNameCaseInsensitive(
        'free will',
        't-1'
      );
      expect(result).toEqual(RAW);
    });
    it('returns null when no match', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(
        await service.findConceptByNameCaseInsensitive('Unknown', 't-1')
      ).toBeNull();
    });
    it('is case-insensitive for mixed case', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      const result = await service.findConceptByNameCaseInsensitive(
        'FREE WILL',
        't-1'
      );
      expect(result).toEqual(RAW);
    });
  });

  describe('linkConceptsByName', function () {
    it('calls executeCypher with MERGE RELATED_TO query', async function () {
      (executeCypher as any).mockResolvedValue([]);
      await service.linkConceptsByName('Metaphysics', 'Ontology', 't-1', 0.7);
      // 5th arg is tenantId passed for RLS set_config inside executeCypher
      expect(executeCypher).toHaveBeenCalledWith(
        expect.anything(),
        'edusphere_graph',
        expect.stringContaining('MERGE'),
        expect.objectContaining({
          fromName: 'Metaphysics',
          toName: 'Ontology',
          tenantId: 't-1',
          strength: 0.7,
        }),
        't-1'
      );
    });
    it('uses default strength of 0.7 when not specified', async function () {
      (executeCypher as any).mockResolvedValue([]);
      await service.linkConceptsByName('A', 'B', 't-1');
      const params = (executeCypher as any).mock.calls[0][3];
      expect(params.strength).toBe(0.7);
    });
  });

  describe('findAllConcepts', function () {
    it('returns concepts', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      expect(await service.findAllConcepts('t-1', 20)).toHaveLength(1);
    });
    it('clamps limit to 200', async function () {
      (executeCypher as any).mockResolvedValue([]);
      await service.findAllConcepts('t-1', 9999);
      expect((executeCypher as any).mock.calls[0][2]).toContain('LIMIT 200');
    });
    it('clamps limit to 1', async function () {
      (executeCypher as any).mockResolvedValue([]);
      await service.findAllConcepts('t-1', 0);
      expect((executeCypher as any).mock.calls[0][2]).toContain('LIMIT 1');
    });
  });

  describe('createConcept', function () {
    it('delegates to createConcept helper', async function () {
      (createConcept as any).mockResolvedValue('new-id');
      var result = await service.createConcept({
        tenant_id: 't-1',
        name: 'X',
        definition: 'Y',
        source_ids: [],
      });
      expect(result).toBe('new-id');
    });
  });

  describe('updateConcept', function () {
    it('updates and returns result', async function () {
      (executeCypher as any).mockResolvedValue([RAW]);
      expect(
        await service.updateConcept('c-1', 't-1', { name: 'Updated' })
      ).toEqual(RAW);
    });
    it('returns null when not found', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.updateConcept('x', 't-1', { name: 'X' })).toBeNull();
    });
  });

  describe('deleteConcept', function () {
    it('returns true on success', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.deleteConcept('c-1', 't-1')).toBe(true);
    });
    it('returns false when throws', async function () {
      (executeCypher as any).mockRejectedValue(new Error('err'));
      expect(await service.deleteConcept('c-1', 't-1')).toBe(false);
    });
  });

  describe('findRelatedConcepts', function () {
    it('delegates to helper', async function () {
      (findRelatedConcepts as any).mockResolvedValue([{ id: 'r-1' }]);
      expect(await service.findRelatedConcepts('c-1', 't-1', 2, 10)).toEqual([
        { id: 'r-1' },
      ]);
    });
  });

  describe('linkConcepts', function () {
    it('delegates to createRelationship', async function () {
      (createRelationship as any).mockResolvedValue(undefined);
      await service.linkConcepts('f-1', 't-1', 'RELATES_TO', { strength: 0.8 });
      expect(createRelationship).toHaveBeenCalledWith(
        expect.anything(),
        'f-1',
        't-1',
        'RELATES_TO',
        { strength: 0.8 }
      );
    });
  });
  describe('findPersonById', function () {
    it('returns person', async function () {
      (executeCypher as any).mockResolvedValue([PERSON]);
      expect(await service.findPersonById('p-1', 't-1')).toEqual(PERSON);
    });
    it('returns null', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findPersonById('x', 't-1')).toBeNull();
    });
  });
  describe('findPersonByName', function () {
    it('returns person', async function () {
      (executeCypher as any).mockResolvedValue([PERSON]);
      expect(await service.findPersonByName('Maimonides', 't-1')).toEqual(
        PERSON
      );
    });
    it('returns null', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findPersonByName('X', 't-1')).toBeNull();
    });
  });
  describe('createPerson', function () {
    it('returns created person', async function () {
      (executeCypher as any).mockResolvedValue([PERSON]);
      expect(await service.createPerson('Maimonides', 'Bio', 't-1')).toEqual(
        PERSON
      );
    });
    it('passes null bio', async function () {
      (executeCypher as any).mockResolvedValue([PERSON]);
      await service.createPerson('Name', null, 't-1');
      expect((executeCypher as any).mock.calls[0][3].bio).toBeNull();
    });
  });

  describe('findTermById', function () {
    it('returns term', async function () {
      (executeCypher as any).mockResolvedValue([TERM]);
      expect(await service.findTermById('term-1', 't-1')).toEqual(TERM);
    });
    it('returns null', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findTermById('x', 't-1')).toBeNull();
    });
  });
  describe('findTermByName', function () {
    it('returns term', async function () {
      (executeCypher as any).mockResolvedValue([TERM]);
      expect(await service.findTermByName('Torah', 't-1')).toEqual(TERM);
    });
    it('returns null', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findTermByName('X', 't-1')).toBeNull();
    });
  });
  describe('createTerm', function () {
    it('returns created term', async function () {
      (executeCypher as any).mockResolvedValue([TERM]);
      expect(await service.createTerm('Torah', 'Scriptures', 't-1')).toEqual(
        TERM
      );
    });
  });

  describe('findSourceById', function () {
    it('returns source', async function () {
      (executeCypher as any).mockResolvedValue([SOURCE]);
      expect(await service.findSourceById('src-1', 't-1')).toEqual(SOURCE);
    });
    it('returns null', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findSourceById('x', 't-1')).toBeNull();
    });
  });
  describe('createSource', function () {
    it('returns created source', async function () {
      (executeCypher as any).mockResolvedValue([SOURCE]);
      expect(await service.createSource('Title', 'BOOK', null, 't-1')).toEqual(
        SOURCE
      );
    });
    it('passes null url', async function () {
      (executeCypher as any).mockResolvedValue([SOURCE]);
      await service.createSource('T', 'BOOK', null, 't-1');
      expect((executeCypher as any).mock.calls[0][3].url).toBeNull();
    });
  });

  describe('findTopicClusterById', function () {
    it('returns cluster', async function () {
      (executeCypher as any).mockResolvedValue([CLUSTER]);
      expect(await service.findTopicClusterById('cl-1', 't-1')).toEqual(
        CLUSTER
      );
    });
    it('returns null', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findTopicClusterById('x', 't-1')).toBeNull();
    });
  });
  describe('findTopicClustersByCourse', function () {
    it('returns clusters', async function () {
      (executeCypher as any).mockResolvedValue([CLUSTER]);
      expect(
        await service.findTopicClustersByCourse('course-1', 't-1')
      ).toHaveLength(1);
    });
    it('returns empty array', async function () {
      (executeCypher as any).mockResolvedValue([]);
      expect(await service.findTopicClustersByCourse('x', 't-1')).toEqual([]);
    });
  });
  describe('createTopicCluster', function () {
    it('returns created cluster', async function () {
      (executeCypher as any).mockResolvedValue([CLUSTER]);
      expect(await service.createTopicCluster('Cluster', null, 't-1')).toEqual(
        CLUSTER
      );
    });
    it('passes null description', async function () {
      (executeCypher as any).mockResolvedValue([CLUSTER]);
      await service.createTopicCluster('C', null, 't-1');
      expect((executeCypher as any).mock.calls[0][3].description).toBeNull();
    });
  });

  // ─── Learning Path methods ────────────────────────────────────────────────

  describe('findShortestLearningPath', function () {
    it('returns null when no rows returned', async function () {
      // LOAD 'age', SET search_path, then SELECT cypher(...)
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({ rows: [] }); // cypher query
      const result = await service.findShortestLearningPath(
        'Algebra',
        'Calculus',
        't-1'
      );
      expect(result).toBeNull();
    });

    it('returns parsed LearningPathResult when path found', async function () {
      const conceptsJson = JSON.stringify([
        { id: 'c-1', name: 'Algebra', type: 'CONCEPT' },
        { id: 'c-2', name: 'Calculus', type: 'CONCEPT' },
      ]);
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // SELECT set_config (set_config call for RLS)
        .mockResolvedValueOnce({
          rows: [{ concepts: conceptsJson, steps: '1' }],
        }); // cypher
      const result = await service.findShortestLearningPath(
        'Algebra',
        'Calculus',
        't-1'
      );
      expect(result).not.toBeNull();
      expect(result!.steps).toBe(1);
      expect(result!.concepts).toHaveLength(2);
      expect(result!.concepts[0].name).toBe('Algebra');
    });

    it('releases pool client on success', async function () {
      mockClientQuery
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] });
      await service.findShortestLearningPath('A', 'B', 't-1');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('returns null and releases client on error', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockRejectedValueOnce(new Error('AGE query failed'));
      const result = await service.findShortestLearningPath('A', 'B', 't-1');
      expect(result).toBeNull();
      expect(mockRelease).toHaveBeenCalled();
    });

    it('includes fromName, toName, tenantId in the cypher SQL / pg params', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [] }); // cypher — index 3
      await service.findShortestLearningPath(
        'Algebra',
        'Calculus',
        'tenant-42'
      );
      const calls = mockClientQuery.mock.calls;
      // 4th call (index 3) is the actual cypher SELECT
      const cypherSql = calls[3]![0] as string;
      const pgParams = JSON.parse((calls[3]![1] as string[])[0]);
      expect(cypherSql).toContain('shortestPath');
      // Values are now in the pg params JSON, not the SQL string
      expect(pgParams).toMatchObject({
        fromName: 'Algebra',
        toName: 'Calculus',
        tenantId: 'tenant-42',
      });
    });
  });

  describe('collectRelatedConcepts', function () {
    it('returns empty array when no rows', async function () {
      mockClientQuery
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] });
      const result = await service.collectRelatedConcepts('Physics', 2, 't-1');
      expect(result).toEqual([]);
    });

    it('parses COLLECT array result correctly', async function () {
      const relatedJson = JSON.stringify([
        { id: 'c-2', name: 'Kinematics', type: 'CONCEPT' },
        { id: 'c-3', name: 'Dynamics', type: 'CONCEPT' },
      ]);
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [{ related: relatedJson }] }); // cypher
      const result = await service.collectRelatedConcepts('Physics', 2, 't-1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Kinematics');
    });

    it('clamps depth to minimum 1', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [] }); // cypher — index 3
      await service.collectRelatedConcepts('Physics', -5, 't-1');
      const cypherSql = mockClientQuery.mock.calls[3]![0] as string;
      expect(cypherSql).toContain('*1..1');
    });

    it('clamps depth to maximum 5', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [] }); // cypher — index 3
      await service.collectRelatedConcepts('Physics', 99, 't-1');
      const cypherSql = mockClientQuery.mock.calls[3]![0] as string;
      expect(cypherSql).toContain('*1..5');
    });

    it('returns empty array and releases client on error', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockRejectedValueOnce(new Error('connection reset'));
      const result = await service.collectRelatedConcepts('Physics', 2, 't-1');
      expect(result).toEqual([]);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('includes COLLECT and DISTINCT in cypher query', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [] }); // cypher — index 3
      await service.collectRelatedConcepts('Physics', 2, 't-1');
      const cypherSql = mockClientQuery.mock.calls[3]![0] as string;
      expect(cypherSql).toContain('COLLECT');
      expect(cypherSql).toContain('DISTINCT');
    });
  });

  describe('findPrerequisiteChain', function () {
    it('returns empty array when no rows', async function () {
      mockClientQuery
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] });
      const result = await service.findPrerequisiteChain('Calculus', 't-1');
      expect(result).toEqual([]);
    });

    it('parses chain array result correctly', async function () {
      const chainJson = JSON.stringify([
        { id: 'c-1', name: 'Arithmetic' },
        { id: 'c-2', name: 'Algebra' },
        { id: 'c-3', name: 'Calculus' },
      ]);
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [{ chain: chainJson }] }); // cypher
      const result = await service.findPrerequisiteChain('Calculus', 't-1');
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Arithmetic');
      expect(result[2].name).toBe('Calculus');
    });

    it('includes PREREQUISITE_OF and ORDER BY length in cypher query', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockResolvedValueOnce({ rows: [] }); // cypher — index 3
      await service.findPrerequisiteChain('Calculus', 't-1');
      const cypherSql = mockClientQuery.mock.calls[3]![0] as string;
      expect(cypherSql).toContain('PREREQUISITE_OF');
      expect(cypherSql).toContain('ORDER BY');
      expect(cypherSql).toContain('LIMIT 1');
    });

    it('returns empty array and releases client on error', async function () {
      mockClientQuery
        .mockResolvedValueOnce({}) // LOAD 'age'
        .mockResolvedValueOnce({}) // SET search_path
        .mockResolvedValueOnce({}) // set_config (RLS)
        .mockRejectedValueOnce(new Error('query failed'));
      const result = await service.findPrerequisiteChain('Calculus', 't-1');
      expect(result).toEqual([]);
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});

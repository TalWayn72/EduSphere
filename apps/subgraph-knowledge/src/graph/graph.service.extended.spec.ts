/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphService } from './graph.service';
import { GraphConceptService } from './graph-concept.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: vi.fn(async (_db, _ctx, cb) => cb()),
}));

var mc = {
  findConceptById: vi.fn(),
  findConceptByName: vi.fn(),
  findConceptByNameCaseInsensitive: vi.fn(),
  findAllConcepts: vi.fn(),
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  findRelatedConcepts: vi.fn(),
  linkConcepts: vi.fn(),
  linkConceptsAndFetch: vi.fn().mockResolvedValue({ from: null, to: null }),
  callEmbeddingProvider: vi.fn(),
  generateEmbedding: vi.fn(),
  findPersonById: vi.fn(),
  findPersonByName: vi.fn(),
  createPerson: vi.fn(),
  findTermById: vi.fn(),
  findTermByName: vi.fn(),
  createTerm: vi.fn(),
  findSourceById: vi.fn(),
  createSource: vi.fn(),
  findTopicClusterById: vi.fn(),
  findTopicClustersByCourse: vi.fn(),
  createTopicCluster: vi.fn(),
  findShortestLearningPath: vi.fn(),
  collectRelatedConcepts: vi.fn(),
  findPrerequisiteChain: vi.fn(),
};

var RAW = {
  id: 'c-1',
  tenant_id: 't-1',
  name: 'X',
  definition: 'D',
  source_ids: '[]',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('GraphService extended', () => {
  var svc;
  beforeEach(() => {
    vi.clearAllMocks();
    mc.linkConceptsAndFetch.mockResolvedValue({ from: null, to: null });
    svc = new GraphService(
      new GraphConceptService(mc as any),
      new GraphSearchService(mc as any, mc as any),
      new GraphPersonTermService(
        mc as any,
        mc as any,
        mc as any,
        mc as any,
        mc as any
      )
    );
  });
  it('findRelatedConcepts maps strength', async () => {
    mc.findRelatedConcepts.mockResolvedValue([{ ...RAW, strength: 0.9 }]);
    var r = await svc.findRelatedConcepts(
      'c-1',
      2,
      10,
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r[0].strength).toBe(0.9);
  });

  it('findRelatedConcepts defaults strength to 1.0', async () => {
    mc.findRelatedConcepts.mockResolvedValue([RAW]);
    var r = await svc.findRelatedConcepts(
      'c-1',
      2,
      10,
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r[0].strength).toBe(1.0);
  });

  it('linkConcepts returns relationship info', async () => {
    mc.linkConcepts.mockResolvedValue(undefined);
    mc.findConceptById
      .mockResolvedValueOnce(RAW)
      .mockResolvedValueOnce({ ...RAW, id: 'c-2' });
    var r = await svc.linkConcepts(
      'c-1',
      'c-2',
      'RELATES_TO',
      0.8,
      'desc',
      't-1',
      'u-1',
      'INSTRUCTOR'
    );
    expect(r.relationshipType).toBe('RELATES_TO');
    expect(r.strength).toBe(0.8);
    expect(r.inferred).toBe(false);
  });

  it('findPersonById delegates to cypherService', async () => {
    mc.findPersonById.mockResolvedValue({ id: 'p-1' });
    expect(await svc.findPersonById('p-1', 't-1', 'u-1', 'STUDENT')).toEqual({
      id: 'p-1',
    });
  });
  it('findPersonByName delegates to cypherService', async () => {
    mc.findPersonByName.mockResolvedValue({ id: 'p-1' });
    expect(
      await svc.findPersonByName('Maimonides', 't-1', 'u-1', 'STUDENT')
    ).toEqual({ id: 'p-1' });
  });
  it('createPerson delegates to cypherService', async () => {
    mc.createPerson.mockResolvedValue({ id: 'p-1' });
    var r = await svc.createPerson(
      'Maimonides',
      'Bio',
      't-1',
      'u-1',
      'INSTRUCTOR'
    );
    expect(mc.createPerson).toHaveBeenCalledWith('Maimonides', 'Bio', 't-1');
    expect(r).toEqual({ id: 'p-1' });
  });

  it('findTermById delegates to cypherService', async () => {
    mc.findTermById.mockResolvedValue({ id: 't-1' });
    expect(await svc.findTermById('t-1', 'ten-1', 'u-1', 'STUDENT')).toEqual({
      id: 't-1',
    });
  });
  it('findTermByName delegates to cypherService', async () => {
    mc.findTermByName.mockResolvedValue({ id: 't-1' });
    expect(
      await svc.findTermByName('Torah', 'ten-1', 'u-1', 'STUDENT')
    ).toEqual({ id: 't-1' });
  });
  it('createTerm delegates to cypherService', async () => {
    mc.createTerm.mockResolvedValue({ id: 't-1' });
    var r = await svc.createTerm(
      'Torah',
      'Scriptures',
      'ten-1',
      'u-1',
      'INSTRUCTOR'
    );
    expect(mc.createTerm).toHaveBeenCalledWith('Torah', 'Scriptures', 'ten-1');
    expect(r).toEqual({ id: 't-1' });
  });

  it('findSourceById delegates to cypherService', async () => {
    mc.findSourceById.mockResolvedValue({ id: 's-1' });
    expect(await svc.findSourceById('s-1', 'ten-1', 'u-1', 'STUDENT')).toEqual({
      id: 's-1',
    });
  });
  it('createSource delegates to cypherService', async () => {
    mc.createSource.mockResolvedValue({ id: 's-1' });
    var r = await svc.createSource(
      'Guide',
      'BOOK',
      null,
      'ten-1',
      'u-1',
      'INSTRUCTOR'
    );
    expect(mc.createSource).toHaveBeenCalledWith(
      'Guide',
      'BOOK',
      null,
      'ten-1'
    );
    expect(r).toEqual({ id: 's-1' });
  });

  it('findTopicClusterById delegates to cypherService', async () => {
    mc.findTopicClusterById.mockResolvedValue({ id: 'cl-1' });
    expect(
      await svc.findTopicClusterById('cl-1', 'ten-1', 'u-1', 'STUDENT')
    ).toEqual({ id: 'cl-1' });
  });
  it('findTopicClustersByCourse delegates to cypherService', async () => {
    mc.findTopicClustersByCourse.mockResolvedValue([{ id: 'cl-1' }]);
    expect(
      await svc.findTopicClustersByCourse('course-1', 'ten-1', 'u-1', 'STUDENT')
    ).toHaveLength(1);
  });
  it('createTopicCluster delegates to cypherService', async () => {
    mc.createTopicCluster.mockResolvedValue({ id: 'cl-1' });
    var r = await svc.createTopicCluster(
      'Cluster',
      null,
      'ten-1',
      'u-1',
      'INSTRUCTOR'
    );
    expect(mc.createTopicCluster).toHaveBeenCalledWith(
      'Cluster',
      null,
      'ten-1'
    );
    expect(r).toEqual({ id: 'cl-1' });
  });

  it('generateEmbedding returns false', async () => {
    expect(
      await svc.generateEmbedding(
        'text',
        'Concept',
        'c-1',
        't-1',
        'u-1',
        'INSTRUCTOR'
      )
    ).toBe(false);
  });
});

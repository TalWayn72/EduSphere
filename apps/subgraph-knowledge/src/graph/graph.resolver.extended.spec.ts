import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';

var mockSvc = {
  findConceptById: vi.fn(),
  findConceptByName: vi.fn(),
  findAllConcepts: vi.fn(),
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  findRelatedConcepts: vi.fn(),
  linkConcepts: vi.fn(),
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
  semanticSearch: vi.fn(),
  generateEmbedding: vi.fn(),
};

var AUTH = {
  req: {},
  authContext: {
    userId: 'u-1',
    tenantId: 't-1',
    roles: ['STUDENT'],
    scopes: [],
  },
};
var NOAUTH = { req: {} };

describe('GraphResolver extended', function () {
  var resolver;
  beforeEach(function () {
    vi.clearAllMocks();
    resolver = new GraphResolver(mockSvc);
  });
  it('term delegates to findTermById', async function () {
    mockSvc.findTermById.mockResolvedValue({ id: 't-1' });
    var r = await resolver.term('t-1', AUTH);
    expect(mockSvc.findTermById).toHaveBeenCalledWith(
      't-1',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 't-1' });
  });
  it('term throws UnauthorizedException', async function () {
    await expect(resolver.term('x', NOAUTH)).rejects.toThrow(
      UnauthorizedException
    );
  });
  it('termByName delegates to findTermByName', async function () {
    mockSvc.findTermByName.mockResolvedValue({ id: 't-1' });
    var r = await resolver.termByName('Torah', AUTH);
    expect(mockSvc.findTermByName).toHaveBeenCalledWith(
      'Torah',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 't-1' });
  });
  it('termByName throws UnauthorizedException', async function () {
    await expect(resolver.termByName('x', NOAUTH)).rejects.toThrow(
      UnauthorizedException
    );
  });
  it('source delegates to findSourceById', async function () {
    mockSvc.findSourceById.mockResolvedValue({ id: 's-1' });
    var r = await resolver.source('s-1', AUTH);
    expect(mockSvc.findSourceById).toHaveBeenCalledWith(
      's-1',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 's-1' });
  });
  it('source throws UnauthorizedException', async function () {
    await expect(resolver.source('x', NOAUTH)).rejects.toThrow(
      UnauthorizedException
    );
  });
  it('topicCluster delegates to findTopicClusterById', async function () {
    mockSvc.findTopicClusterById.mockResolvedValue({ id: 'cl-1' });
    var r = await resolver.topicCluster('cl-1', AUTH);
    expect(mockSvc.findTopicClusterById).toHaveBeenCalledWith(
      'cl-1',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 'cl-1' });
  });
  it('topicCluster throws UnauthorizedException', async function () {
    await expect(resolver.topicCluster('x', NOAUTH)).rejects.toThrow(
      UnauthorizedException
    );
  });
  it('topicClustersByCourse delegates correctly', async function () {
    mockSvc.findTopicClustersByCourse.mockResolvedValue([{ id: 'cl-1' }]);
    var r = await resolver.topicClustersByCourse('course-1', AUTH);
    expect(mockSvc.findTopicClustersByCourse).toHaveBeenCalledWith(
      'course-1',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toHaveLength(1);
  });
  it('topicClustersByCourse throws UnauthorizedException', async function () {
    await expect(resolver.topicClustersByCourse('x', NOAUTH)).rejects.toThrow(
      UnauthorizedException
    );
  });
  it('createTerm delegates correctly', async function () {
    mockSvc.createTerm.mockResolvedValue({ id: 't-1' });
    var r = await resolver.createTerm(
      { name: 'Torah', definition: 'Scriptures' },
      AUTH
    );
    expect(mockSvc.createTerm).toHaveBeenCalledWith(
      'Torah',
      'Scriptures',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 't-1' });
  });
  it('createTerm throws UnauthorizedException', async function () {
    await expect(
      resolver.createTerm({ name: 'X', definition: 'Y' }, NOAUTH)
    ).rejects.toThrow(UnauthorizedException);
  });
  it('createSource delegates correctly', async function () {
    mockSvc.createSource.mockResolvedValue({ id: 's-1' });
    var r = await resolver.createSource(
      { title: 'Guide', type: 'BOOK', url: null },
      AUTH
    );
    expect(mockSvc.createSource).toHaveBeenCalledWith(
      'Guide',
      'BOOK',
      null,
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 's-1' });
  });
  it('createSource throws UnauthorizedException', async function () {
    await expect(
      resolver.createSource({ title: 'X', type: 'Y' }, NOAUTH)
    ).rejects.toThrow(UnauthorizedException);
  });
  it('createTopicCluster delegates correctly', async function () {
    mockSvc.createTopicCluster.mockResolvedValue({ id: 'cl-1' });
    var r = await resolver.createTopicCluster(
      { name: 'Cluster', description: null },
      AUTH
    );
    expect(mockSvc.createTopicCluster).toHaveBeenCalledWith(
      'Cluster',
      null,
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toEqual({ id: 'cl-1' });
  });
  it('createTopicCluster throws UnauthorizedException', async function () {
    await expect(
      resolver.createTopicCluster({ name: 'X' }, NOAUTH)
    ).rejects.toThrow(UnauthorizedException);
  });
  it('generateEmbedding delegates correctly', async function () {
    mockSvc.generateEmbedding.mockResolvedValue(false);
    var r = await resolver.generateEmbedding('text', 'Concept', 'c-1', AUTH);
    expect(mockSvc.generateEmbedding).toHaveBeenCalledWith(
      'text',
      'Concept',
      'c-1',
      't-1',
      'u-1',
      'STUDENT'
    );
    expect(r).toBe(false);
  });
  it('generateEmbedding throws UnauthorizedException', async function () {
    await expect(
      resolver.generateEmbedding('t', 'C', 'id', NOAUTH)
    ).rejects.toThrow(UnauthorizedException);
  });
});

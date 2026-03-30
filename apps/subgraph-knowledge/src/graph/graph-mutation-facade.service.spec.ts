import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Sub-service mocks ─────────────────────────────────────────────────────
const mockCreateConcept = vi.fn();
const mockUpdateConcept = vi.fn();
const mockDeleteConcept = vi.fn();

vi.mock('./graph-concept.service', () => ({
  GraphConceptService: class {
    createConcept = mockCreateConcept;
    updateConcept = mockUpdateConcept;
    deleteConcept = mockDeleteConcept;
  },
}));

const mockLinkConcepts = vi.fn();
vi.mock('./graph-concept-link.service', () => ({
  GraphConceptLinkService: class {
    linkConcepts = mockLinkConcepts;
  },
}));

const mockGenerateEmbedding = vi.fn();
vi.mock('./graph-search.service', () => ({
  GraphSearchService: class {
    generateEmbedding = mockGenerateEmbedding;
  },
}));

const mockCreatePerson = vi.fn();
const mockCreateTerm = vi.fn();
vi.mock('./graph-person-term.service', () => ({
  GraphPersonTermService: class {
    createPerson = mockCreatePerson;
    createTerm = mockCreateTerm;
  },
}));

const mockCreateSource = vi.fn();
const mockCreateTopicCluster = vi.fn();
vi.mock('./graph-source-cluster.service', () => ({
  GraphSourceClusterService: class {
    createSource = mockCreateSource;
    createTopicCluster = mockCreateTopicCluster;
  },
}));

import { GraphMutationFacadeService } from './graph-mutation-facade.service.js';
import { GraphConceptService } from './graph-concept.service.js';
import { GraphConceptLinkService } from './graph-concept-link.service.js';
import { GraphSearchService } from './graph-search.service.js';
import { GraphPersonTermService } from './graph-person-term.service.js';
import { GraphSourceClusterService } from './graph-source-cluster.service.js';

const T = 'tenant-1';
const U = 'user-1';
const R = 'INSTRUCTOR';

describe('GraphMutationFacadeService', () => {
  let facade: GraphMutationFacadeService;

  beforeEach(() => {
    vi.clearAllMocks();
    facade = new GraphMutationFacadeService(
      new GraphConceptService(null as never, null as never),
      new GraphConceptLinkService(null as never),
      new GraphSearchService(null as never, null as never),
      new GraphPersonTermService(null as never, null as never),
      new GraphSourceClusterService(null as never, null as never, null as never)
    );
  });

  // ── Concept mutations ─────────────────────────────────────────────────
  it('createConcept delegates with all args', async () => {
    const created = { id: 'c1', name: 'React' };
    mockCreateConcept.mockResolvedValue(created);
    const result = await facade.createConcept(
      'React', 'UI lib', ['s1'], T, U, R
    );
    expect(result).toBe(created);
    expect(mockCreateConcept).toHaveBeenCalledWith(
      'React', 'UI lib', ['s1'], T, U, R
    );
  });

  it('createConcept defaults sourceIds to empty array', async () => {
    mockCreateConcept.mockResolvedValue({ id: 'c2' });
    await facade.createConcept('Vue', 'Framework', undefined as never, T, U, R);
    expect(mockCreateConcept).toHaveBeenCalled();
  });

  it('updateConcept delegates correctly', async () => {
    mockUpdateConcept.mockResolvedValue({ id: 'c1', name: 'React 19' });
    await facade.updateConcept('c1', { name: 'React 19' }, T, U, R);
    expect(mockUpdateConcept).toHaveBeenCalledWith(
      'c1', { name: 'React 19' }, T, U, R
    );
  });

  it('deleteConcept delegates and returns boolean', async () => {
    mockDeleteConcept.mockResolvedValue(true);
    const result = await facade.deleteConcept('c1', T, U, R);
    expect(result).toBe(true);
    expect(mockDeleteConcept).toHaveBeenCalledWith('c1', T, U, R);
  });

  // ── Concept links ─────────────────────────────────────────────────────
  it('linkConcepts delegates with relationship type', async () => {
    mockLinkConcepts.mockResolvedValue({ id: 'link-1' });
    await facade.linkConcepts(
      'c1', 'c2', 'PREREQUISITE' as never, 0.8, 'requires', T, U, R
    );
    expect(mockLinkConcepts).toHaveBeenCalledWith(
      'c1', 'c2', 'PREREQUISITE', 0.8, 'requires', T, U, R
    );
  });

  // ── Embedding generation ──────────────────────────────────────────────
  it('generateEmbedding delegates correctly', async () => {
    mockGenerateEmbedding.mockResolvedValue(true);
    const result = await facade.generateEmbedding(
      'some text', 'concept', 'c1', T, U, R
    );
    expect(result).toBe(true);
    expect(mockGenerateEmbedding).toHaveBeenCalledWith(
      'some text', 'concept', 'c1', T, U, R
    );
  });

  // ── Person / Term / Source / TopicCluster mutations ───────────────────
  it('createPerson delegates correctly', async () => {
    mockCreatePerson.mockResolvedValue({ id: 'p1', name: 'Turing' });
    await facade.createPerson('Turing', 'Mathematician', T, U, R);
    expect(mockCreatePerson).toHaveBeenCalledWith(
      'Turing', 'Mathematician', T, U, R
    );
  });

  it('createTerm delegates correctly', async () => {
    mockCreateTerm.mockResolvedValue({ id: 't1' });
    await facade.createTerm('Ontology', 'Study of being', T, U, R);
    expect(mockCreateTerm).toHaveBeenCalledWith(
      'Ontology', 'Study of being', T, U, R
    );
  });

  it('createSource delegates correctly', async () => {
    mockCreateSource.mockResolvedValue({ id: 's1' });
    await facade.createSource('Doc', 'FILE_PDF', null, T, U, R);
    expect(mockCreateSource).toHaveBeenCalledWith(
      'Doc', 'FILE_PDF', null, T, U, R
    );
  });

  it('createTopicCluster delegates correctly', async () => {
    mockCreateTopicCluster.mockResolvedValue({ id: 'tc1' });
    await facade.createTopicCluster('ML Basics', 'Intro', T, U, R);
    expect(mockCreateTopicCluster).toHaveBeenCalledWith(
      'ML Basics', 'Intro', T, U, R
    );
  });

  // ── Error propagation ─────────────────────────────────────────────────
  it('propagates errors from sub-services', async () => {
    mockCreateConcept.mockRejectedValue(new Error('DB error'));
    await expect(
      facade.createConcept('X', 'Y', [], T, U, R)
    ).rejects.toThrow('DB error');
  });
});

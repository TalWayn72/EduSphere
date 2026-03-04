/**
 * Unit tests for CypherConceptService — Concept CRUD operations only.
 * Relation operations (findRelatedConcepts, linkConcepts, linkConceptsAndFetch) are
 * tested in cypher-concept-relation.service.spec.ts.
 *
 * Direct class instantiation — no NestJS TestingModule.
 * All @edusphere/db helpers are mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks — must appear before the vi.mock() factory ─────────────────
const mockExecuteCypher = vi.fn();
const mockCreateConcept = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {},
  executeCypher: (...args: unknown[]) => mockExecuteCypher(...args),
  createConcept: (...args: unknown[]) => mockCreateConcept(...args),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

vi.mock('../constants.js', () => ({
  MAX_CONCEPT_LIMIT: 100,
}));

import { CypherConceptService } from './cypher-concept.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const TENANT = 't-1';
const CONCEPT = {
  id: 'c-1',
  tenant_id: TENANT,
  name: 'Epistemology',
  definition: 'Study of knowledge',
  source_ids: [],
};

describe('CypherConceptService', () => {
  let service: CypherConceptService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CypherConceptService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('findConceptById returns first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([CONCEPT]);

    const result = await service.findConceptById('c-1', TENANT);

    expect(result).toEqual(CONCEPT);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('findConceptById returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findConceptById('missing', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('findConceptByName delegates to executeCypher with correct query params', async () => {
    mockExecuteCypher.mockResolvedValue([CONCEPT]);

    const result = await service.findConceptByName('Epistemology', TENANT);

    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { name: 'Epistemology', tenantId: TENANT },
      TENANT
    );
    expect(result).toEqual(CONCEPT);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('findConceptByNameCaseInsensitive calls executeCypher and returns first result', async () => {
    mockExecuteCypher.mockResolvedValue([CONCEPT]);

    const result = await service.findConceptByNameCaseInsensitive(
      'epistemology',
      TENANT
    );

    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.stringContaining('toLower'),
      { name: 'epistemology', tenantId: TENANT },
      TENANT
    );
    expect(result).toEqual(CONCEPT);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('createConcept delegates to createConcept helper and returns its result', async () => {
    mockCreateConcept.mockResolvedValue('new-concept-id');
    const props = {
      tenant_id: TENANT,
      name: 'Ontology',
      definition: 'Study of being',
      source_ids: [] as string[],
    };

    const result = await service.createConcept(props);

    expect(mockCreateConcept).toHaveBeenCalledWith(expect.anything(), props);
    expect(result).toBe('new-concept-id');
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('service instantiates without error', () => {
    expect(() => new CypherConceptService()).not.toThrow();
  });
});

/**
 * graph-concept-link.service.spec.ts
 * Unit tests for GraphConceptLinkService — RLS-wrapped concept link operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

// ── CypherConceptRelationService mock ─────────────────────────────────────────

const mockFindRelated = vi.fn();
const mockLinkAndFetch = vi.fn();

vi.mock('./cypher-concept-relation.service.js', () => ({
  CypherConceptRelationService: class {
    findRelatedConcepts = mockFindRelated;
    linkConceptsAndFetch = mockLinkAndFetch;
  },
}));

vi.mock('./graph-types', () => ({
  toUserRole: vi.fn((r: string) => r),
}));

import { GraphConceptLinkService } from './graph-concept-link.service.js';
import { CypherConceptRelationService } from './cypher-concept-relation.service.js';

const sampleNode = {
  id: 'c-1',
  tenant_id: 'tenant-1',
  name: 'React',
  definition: 'A JS library',
  source_ids: '["src-1"]',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('GraphConceptLinkService', () => {
  let service: GraphConceptLinkService;
  let cypherRelation: CypherConceptRelationService;

  beforeEach(() => {
    vi.clearAllMocks();
    cypherRelation = new CypherConceptRelationService({} as never);
    service = new GraphConceptLinkService(cypherRelation);
  });

  // ── findRelatedConcepts ───────────────────────────────────────────────────

  it('wraps findRelatedConcepts in withTenantContext', async () => {
    mockFindRelated.mockResolvedValue([
      { ...sampleNode, strength: 0.9 },
    ]);
    await service.findRelatedConcepts('c-1', 2, 10, 'tenant-1', 'user-1', 'STUDENT');
    expect(mockWithTenantContext).toHaveBeenCalled();
    expect(mockFindRelated).toHaveBeenCalledWith('c-1', 'tenant-1', 2, 10);
  });

  it('maps related concepts to GQL shape with strength', async () => {
    mockFindRelated.mockResolvedValue([{ ...sampleNode, strength: 0.75 }]);
    const result = await service.findRelatedConcepts('c-1', 1, 5, 'tenant-1', 'u1', 'STUDENT');
    expect(Array.isArray(result)).toBe(true);
    const first = (result as Array<{ concept: unknown; strength: number }>)[0];
    expect(first.strength).toBe(0.75);
    expect((first.concept as { name: string }).name).toBe('React');
  });

  it('defaults strength to 1.0 when undefined', async () => {
    mockFindRelated.mockResolvedValue([{ ...sampleNode }]); // no strength
    const result = await service.findRelatedConcepts('c-1', 1, 5, 'tenant-1', 'u1', 'STUDENT');
    const first = (result as Array<{ strength: number }>)[0];
    expect(first.strength).toBe(1.0);
  });

  // ── linkConcepts ──────────────────────────────────────────────────────────

  it('wraps linkConceptsAndFetch in withTenantContext', async () => {
    mockLinkAndFetch.mockResolvedValue({ from: sampleNode, to: sampleNode });
    await service.linkConcepts(
      'from-1', 'to-2', 'RELATED_TO', 0.8, 'desc', 'tenant-1', 'user-1', 'INSTRUCTOR'
    );
    expect(mockWithTenantContext).toHaveBeenCalled();
    expect(mockLinkAndFetch).toHaveBeenCalledWith(
      'from-1', 'to-2', 'RELATED_TO',
      expect.objectContaining({ strength: 0.8, description: 'desc' }),
      'tenant-1'
    );
  });

  it('returns relationship result with mapped fromConcept and toConcept', async () => {
    mockLinkAndFetch.mockResolvedValue({ from: sampleNode, to: sampleNode });
    const result = await service.linkConcepts(
      'from-1', 'to-2', 'PREREQ', null, null, 'tenant-1', 'user-1', 'STUDENT'
    ) as { fromConcept: unknown; toConcept: unknown; relationshipType: string };
    expect(result.relationshipType).toBe('PREREQ');
    expect(result.fromConcept).not.toBeNull();
    expect(result.toConcept).not.toBeNull();
  });
});

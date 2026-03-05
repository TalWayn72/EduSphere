/**
 * cypher-concept-relation.service.spec.ts
 * Unit tests for CypherConceptRelationService.
 * Mocks @edusphere/db Cypher helpers and @edusphere/config.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockExecuteCypher = vi.fn();
const mockFindRelatedConcepts = vi.fn();
const mockCreateRelationship = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {},
  executeCypher: (...args: unknown[]) => mockExecuteCypher(...args),
  findRelatedConcepts: (...args: unknown[]) => mockFindRelatedConcepts(...args),
  createRelationship: (...args: unknown[]) => mockCreateRelationship(...args),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { CypherConceptRelationService } from './cypher-concept-relation.service.js';

describe('CypherConceptRelationService', () => {
  let service: CypherConceptRelationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CypherConceptRelationService();
  });

  // ── linkConceptsByName ────────────────────────────────────────────────────

  it('calls executeCypher with fromName, toName, tenantId, strength', async () => {
    mockExecuteCypher.mockResolvedValue([]);
    await service.linkConceptsByName('React', 'JavaScript', 'tenant-1', 0.9);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      {},
      'edusphere_graph',
      expect.stringContaining('MERGE'),
      expect.objectContaining({ fromName: 'React', toName: 'JavaScript', tenantId: 'tenant-1', strength: 0.9 }),
      'tenant-1'
    );
  });

  it('uses default strength 0.7 when not provided', async () => {
    mockExecuteCypher.mockResolvedValue([]);
    await service.linkConceptsByName('A', 'B', 'tenant-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ strength: 0.7 }),
      expect.anything()
    );
  });

  // ── findRelatedConcepts ───────────────────────────────────────────────────

  it('delegates to db helper findRelatedConcepts', async () => {
    const related = [{ id: 'c-2', name: 'TypeScript', strength: 0.8 }];
    mockFindRelatedConcepts.mockResolvedValue(related);
    const result = await service.findRelatedConcepts('c-1', 'tenant-1', 2, 10);
    expect(mockFindRelatedConcepts).toHaveBeenCalledWith({}, 'c-1', 'tenant-1', 2, 10);
    expect(result).toBe(related);
  });

  // ── linkConcepts ──────────────────────────────────────────────────────────

  it('delegates to createRelationship with ids and type', async () => {
    mockCreateRelationship.mockResolvedValue(undefined);
    await service.linkConcepts('from-1', 'to-2', 'RELATED_TO', { strength: 0.5 });
    expect(mockCreateRelationship).toHaveBeenCalledWith(
      {},
      'from-1',
      'to-2',
      'RELATED_TO',
      { strength: 0.5 }
    );
  });

  // ── linkConceptsAndFetch ──────────────────────────────────────────────────

  it('executes single Cypher round-trip and returns from/to nodes', async () => {
    const fromNode = { id: 'from-1', name: 'React' };
    const toNode = { id: 'to-2', name: 'Vue' };
    mockExecuteCypher.mockResolvedValue([{ a: fromNode, b: toNode }]);
    const result = await service.linkConceptsAndFetch(
      'from-1',
      'to-2',
      'RELATED_TO',
      { strength: 0.8, description: 'related frameworks' },
      'tenant-1'
    );
    expect(result.from).toBe(fromNode);
    expect(result.to).toBe(toNode);
  });

  it('returns null nodes when result set is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);
    const result = await service.linkConceptsAndFetch(
      'x', 'y', 'PREREQ', {}, 'tenant-1'
    );
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
  });
});

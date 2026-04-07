import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeGraphOntology,
  findRelatedConcepts,
  findContradictions,
  findLearningPath,
  createRelationship,
  createConcept,
  createSourceNode,
} from './ontology';
import type { DrizzleDB } from './client';

// ---------------------------------------------------------------------------
// Mock executeCypher at the module level.
// IMPORTANT: The factory must use vi.fn() directly — no top-level variables
// referenced here because vi.mock() is hoisted before variable initialisation.
// ---------------------------------------------------------------------------

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    executeCypher: vi.fn(),
  };
});

// Import the mocked function AFTER vi.mock() so we get the mock instance.
import { executeCypher } from './client';

// Cast to vi mock type so we can call .mockResolvedValue() etc.
const mockExecuteCypher = vi.mocked(executeCypher);

function buildMockDb(): DrizzleDB {
  return {} as unknown as DrizzleDB;
}

// ---------------------------------------------------------------------------
// initializeGraphOntology — all 5 vertex types
// ---------------------------------------------------------------------------

describe('initializeGraphOntology()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher exactly 5 times (one per vertex type)', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    expect(mockExecuteCypher).toHaveBeenCalledTimes(5);
  });

  it('creates a Concept vertex', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    const queries = mockExecuteCypher.mock.calls.map((c) => c[2] as string);
    expect(queries.some((q) => q.includes(':Concept'))).toBe(true);
  });

  it('creates a Person vertex', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    const queries = mockExecuteCypher.mock.calls.map((c) => c[2] as string);
    expect(queries.some((q) => q.includes(':Person'))).toBe(true);
  });

  it('creates a TopicCluster vertex', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    const queries = mockExecuteCypher.mock.calls.map((c) => c[2] as string);
    expect(queries.some((q) => q.includes(':TopicCluster'))).toBe(true);
  });

  it('creates a Term vertex', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    const queries = mockExecuteCypher.mock.calls.map((c) => c[2] as string);
    expect(queries.some((q) => q.includes(':Term'))).toBe(true);
  });

  it('creates a Source vertex', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    const queries = mockExecuteCypher.mock.calls.map((c) => c[2] as string);
    expect(queries.some((q) => q.includes(':Source'))).toBe(true);
  });

  it('all 5 vertex types are initialized with tenant_id=default', async () => {
    const db = buildMockDb();
    await initializeGraphOntology(db);
    const queries = mockExecuteCypher.mock.calls.map((c) => c[2] as string);
    const vertexTypes = ['Concept', 'Person', 'TopicCluster', 'Term', 'Source'];
    for (const vtype of vertexTypes) {
      const matching = queries.find((q) => q.includes(`:${vtype}`));
      expect(matching).toBeDefined();
      expect(matching).toContain("'default'");
    }
  });
});

// ---------------------------------------------------------------------------
// findRelatedConcepts
// ---------------------------------------------------------------------------

describe('findRelatedConcepts()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with conceptId and tenantId as params', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'concept-1', 'tenant-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ conceptId: 'concept-1', tenantId: 'tenant-1' })
    );
  });

  it('uses $conceptId and $tenantId placeholders in query (no raw interpolation)', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c-123', 'tenant-abc');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$conceptId');
    expect(query).toContain('$tenantId');
  });

  it('clamps maxDepth=0 to 1', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 0);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..1');
  });

  it('clamps maxDepth=15 to 10', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 15);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..10');
  });

  it('uses the provided valid maxDepth=3', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 3);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..3');
  });

  it('clamps limit=0 to 1', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 2, 0);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('LIMIT 1');
  });

  it('clamps limit=500 to 100', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't', 2, 500);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('LIMIT 100');
  });

  it('uses default depth=2 and limit=10', async () => {
    const db = buildMockDb();
    await findRelatedConcepts(db, 'c', 't');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('1..2');
    expect(query).toContain('LIMIT 10');
  });

  it('returns the rows from executeCypher', async () => {
    const rows = [{ name: 'Calculus', definition: 'Math' }];
    mockExecuteCypher.mockResolvedValueOnce(rows);
    const db = buildMockDb();
    const result = await findRelatedConcepts(db, 'c', 't');
    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// findContradictions
// ---------------------------------------------------------------------------

describe('findContradictions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with conceptId param', async () => {
    const db = buildMockDb();
    await findContradictions(db, 'concept-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ conceptId: 'concept-1' })
    );
  });

  it('uses $conceptId placeholder in query', async () => {
    const db = buildMockDb();
    await findContradictions(db, 'concept-xyz');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$conceptId');
  });

  it('query includes CONTRADICTS relationship type', async () => {
    const db = buildMockDb();
    await findContradictions(db, 'c');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('CONTRADICTS');
  });

  it('returns results from executeCypher', async () => {
    const rows = [{ name: 'Anti-concept', description: 'Contradicts' }];
    mockExecuteCypher.mockResolvedValueOnce(rows);
    const db = buildMockDb();
    const result = await findContradictions(db, 'c');
    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// findLearningPath
// ---------------------------------------------------------------------------

describe('findLearningPath()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with conceptId param', async () => {
    const db = buildMockDb();
    await findLearningPath(db, 'concept-1');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ conceptId: 'concept-1' })
    );
  });

  it('uses $conceptId placeholder in query', async () => {
    const db = buildMockDb();
    await findLearningPath(db, 'concept-abc');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$conceptId');
  });

  it('query includes PREREQUISITE_OF relationship type', async () => {
    const db = buildMockDb();
    await findLearningPath(db, 'c');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('PREREQUISITE_OF');
  });

  it('returns results from executeCypher', async () => {
    const rows = [{ path: ['Algebra', 'Calculus'] }];
    mockExecuteCypher.mockResolvedValueOnce(rows);
    const db = buildMockDb();
    const result = await findLearningPath(db, 'c');
    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// createRelationship
// ---------------------------------------------------------------------------

describe('createRelationship()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with fromConceptId and toConceptId params', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'from-1', 'to-2', 'RELATED_TO');
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      db,
      'edusphere_graph',
      expect.any(String),
      expect.objectContaining({ fromConceptId: 'from-1', toConceptId: 'to-2' })
    );
  });

  it('uses $fromConceptId and $toConceptId in query (not raw interpolation)', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'f', 't', 'RELATED_TO');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('$fromConceptId');
    expect(query).toContain('$toConceptId');
  });

  it('includes the relationship type in the CREATE clause', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'f', 't', 'CONTRADICTS');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('CONTRADICTS');
  });

  it('serialises relationship properties into the query', async () => {
    const db = buildMockDb();
    await createRelationship(db, 'f', 't', 'RELATED_TO', {
      strength: 0.8,
      inferred: true,
    });
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('0.8');
    expect(query).toContain('true');
  });

  it('works without optional properties', async () => {
    const db = buildMockDb();
    await expect(
      createRelationship(db, 'f', 't', 'RELATED_TO')
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BUG-104: createConcept — timestamps must be numeric, not literal "timestamp()"
// ---------------------------------------------------------------------------

describe('createConcept() — BUG-104 + BUG-107 regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('embeds numeric created_at/updated_at in the Cypher query (not string "timestamp()")', async () => {
    const db = buildMockDb();
    await createConcept(db, {
      tenant_id: 'tenant-1',
      name: 'Test Concept',
      definition: 'A test',
    });

    const query: string = mockExecuteCypher.mock.calls[0][2];
    // The JSON embedded in the query must contain numeric timestamps, not "timestamp()"
    // Extract the JSON portion from CREATE (c:Concept {...}) RETURN ...
    const jsonMatch = query.match(/\{[^}]+\}/);
    expect(jsonMatch).not.toBeNull();
    const props = JSON.parse(jsonMatch![0]);
    expect(typeof props.created_at).toBe('number');
    expect(typeof props.updated_at).toBe('number');
    // Must be a valid epoch millis (within last minute)
    expect(props.created_at).toBeGreaterThan(Date.now() - 60_000);
    expect(props.updated_at).toBeGreaterThan(Date.now() - 60_000);
  });

  it('does NOT contain the string "timestamp()" in the embedded JSON', async () => {
    const db = buildMockDb();
    await createConcept(db, {
      tenant_id: 'tenant-1',
      name: 'Test',
      definition: 'A test',
    });

    const query: string = mockExecuteCypher.mock.calls[0][2];
    // BUG-104 root cause: JSON.stringify({created_at: 'timestamp()'}) produced
    // "created_at":"timestamp()" in the Cypher query, which AGE stored as a string.
    expect(query).not.toContain('"timestamp()"');
  });

  it('BUG-107: does NOT contain literal "gen_random_uuid()::text" in the embedded JSON', async () => {
    const db = buildMockDb();
    await createConcept(db, {
      tenant_id: 'tenant-1',
      name: 'Test',
      definition: 'A test',
    });

    const query: string = mockExecuteCypher.mock.calls[0][2];
    // BUG-107 root cause: JSON.stringify({id: 'gen_random_uuid()::text'}) produced
    // "id":"gen_random_uuid()::text" in the Cypher query, stored as a string literal.
    expect(query).not.toContain('"gen_random_uuid()::text"');
  });

  it('BUG-107: uses a valid UUID format for the id when no id is provided', async () => {
    const db = buildMockDb();
    const result = await createConcept(db, {
      tenant_id: 'tenant-1',
      name: 'Test',
      definition: 'A test',
    });

    // createConcept now generates a UUID in JS and returns it directly
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    // The same UUID should appear in the Cypher query
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain(result);
  });

  it('BUG-107: preserves caller-provided id when present', async () => {
    const db = buildMockDb();
    const result = await createConcept(db, {
      id: 'my-custom-id',
      tenant_id: 'tenant-1',
      name: 'Test',
      definition: 'A test',
    });

    expect(result).toBe('my-custom-id');
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('"my-custom-id"');
  });
});

// ---------------------------------------------------------------------------
// createSourceNode — GAP 9 knowledge graph indexing
// ---------------------------------------------------------------------------

describe('createSourceNode()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
  });

  it('calls executeCypher with Source MERGE query', async () => {
    const db = buildMockDb();
    await createSourceNode(db, {
      id: 'ks-1',
      tenant_id: 'tenant-1',
      name: 'Test Source',
      source_type: 'URL',
      origin: 'https://example.com',
      course_id: 'course-1',
      chunk_count: 5,
    });
    expect(mockExecuteCypher).toHaveBeenCalledTimes(1);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('MERGE');
    expect(query).toContain(':Source');
  });

  it('passes source id as parameter (not raw interpolation)', async () => {
    const db = buildMockDb();
    await createSourceNode(db, {
      id: 'source-abc',
      tenant_id: 'tenant-1',
      name: 'My Source',
      source_type: 'FILE_PDF',
    });
    const params = mockExecuteCypher.mock.calls[0][3] as Record<
      string,
      unknown
    >;
    expect(params).toMatchObject({ id: 'source-abc' });
  });

  it('is idempotent — MERGE prevents duplicate nodes', async () => {
    const db = buildMockDb();
    const props = {
      id: 'ks-dup',
      tenant_id: 'tenant-1',
      name: 'Dup Source',
      source_type: 'TEXT',
    };
    await createSourceNode(db, props);
    await createSourceNode(db, props);
    // executeCypher called twice (once per call) — both use MERGE so DB stays consistent
    expect(mockExecuteCypher).toHaveBeenCalledTimes(2);
    const query: string = mockExecuteCypher.mock.calls[0][2];
    expect(query).toContain('MERGE');
  });

  it('handles optional fields with defaults', async () => {
    const db = buildMockDb();
    await createSourceNode(db, {
      id: 'ks-minimal',
      tenant_id: 'tenant-1',
      name: 'Minimal',
      source_type: 'TEXT',
    });
    const query: string = mockExecuteCypher.mock.calls[0][2];
    // Should embed default empty string for origin/course_id
    expect(query).toContain('""');
  });
});

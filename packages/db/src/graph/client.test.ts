import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeCypher,
  toCypherLiteral,
  substituteParams,
  addVertex,
  addEdge,
  queryNodes,
  traverse,
} from './client';
import type { DrizzleDB } from './client';

// ---------------------------------------------------------------------------
// Mock pg client and pool
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();
const mockRelease = vi.fn();

const mockPgClient = {
  query: mockQuery,
  release: mockRelease,
};

const mockPool = {
  connect: vi.fn().mockResolvedValue(mockPgClient),
};

/** Build a mock DrizzleDB where $client is the mock pool. */
function buildMockDb(): DrizzleDB {
  return { $client: mockPool } as unknown as DrizzleDB;
}

const GRAPH = 'edusphere_graph';

// ---------------------------------------------------------------------------
// toCypherLiteral
// ---------------------------------------------------------------------------

describe('toCypherLiteral()', () => {
  it('returns null for null', () => {
    expect(toCypherLiteral(null)).toBe('null');
  });

  it('returns null for undefined', () => {
    expect(toCypherLiteral(undefined)).toBe('null');
  });

  it('returns number as string', () => {
    expect(toCypherLiteral(42)).toBe('42');
    expect(toCypherLiteral(3.14)).toBe('3.14');
  });

  it('returns boolean as string', () => {
    expect(toCypherLiteral(true)).toBe('true');
    expect(toCypherLiteral(false)).toBe('false');
  });

  it('wraps string in double quotes', () => {
    expect(toCypherLiteral('hello')).toBe('"hello"');
  });

  it('escapes double quotes inside string', () => {
    expect(toCypherLiteral('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('escapes backslashes', () => {
    expect(toCypherLiteral('back\\slash')).toBe('"back\\\\slash"');
  });

  it('escapes newlines', () => {
    expect(toCypherLiteral('line1\nline2')).toBe('"line1\\nline2"');
  });

  it('handles UUIDs without modification (safe chars only)', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(toCypherLiteral(uuid)).toBe(`"${uuid}"`);
  });
});

// ---------------------------------------------------------------------------
// substituteParams
// ---------------------------------------------------------------------------

describe('substituteParams()', () => {
  it('replaces $key with the literal value', () => {
    const result = substituteParams(
      'MATCH (c {tenant_id: $tenantId}) RETURN c',
      { tenantId: 'tenant-abc' },
    );
    expect(result).toBe('MATCH (c {tenant_id: "tenant-abc"}) RETURN c');
  });

  it('replaces multiple params', () => {
    const result = substituteParams(
      'MATCH (c {id: $id, tenant_id: $tenantId}) RETURN c',
      { id: 'concept-1', tenantId: 'tenant-1' },
    );
    expect(result).toContain('"concept-1"');
    expect(result).toContain('"tenant-1"');
  });

  it('replaces numeric param with unquoted number', () => {
    const result = substituteParams('SET r.strength = $strength', { strength: 0.7 });
    expect(result).toBe('SET r.strength = 0.7');
  });

  it('replaces null param with null keyword', () => {
    const result = substituteParams('SET n.bio = $bio', { bio: null });
    expect(result).toBe('SET n.bio = null');
  });

  it('leaves unknown $tokens untouched', () => {
    const result = substituteParams('MATCH (n {id: $unknown}) RETURN n', { tenantId: 't1' });
    expect(result).toBe('MATCH (n {id: $unknown}) RETURN n');
  });

  it('escapes double quotes in string values to prevent Cypher injection', () => {
    const result = substituteParams(
      'MATCH (n {name: $name}) RETURN n',
      { name: 'evil"injection' },
    );
    expect(result).toContain('\\"injection');
    expect(result).not.toContain('evil"injection');
  });
});

// ---------------------------------------------------------------------------
// executeCypher
// ---------------------------------------------------------------------------

describe('executeCypher()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('acquires a client from the pool', async () => {
    const db = buildMockDb();
    await executeCypher(db, GRAPH, 'MATCH (n) RETURN n');
    expect(mockPool.connect).toHaveBeenCalledOnce();
  });

  it('loads the AGE extension before running the query', async () => {
    const db = buildMockDb();
    await executeCypher(db, GRAPH, 'MATCH (n) RETURN n');
    expect(mockQuery).toHaveBeenCalledWith("LOAD 'age'");
  });

  it('sets search_path to ag_catalog', async () => {
    const db = buildMockDb();
    await executeCypher(db, GRAPH, 'MATCH (n) RETURN n');
    expect(mockQuery).toHaveBeenCalledWith(
      'SET search_path = ag_catalog, "$user", public'
    );
  });

  it('releases the client in the finally block (success path)', async () => {
    const db = buildMockDb();
    await executeCypher(db, GRAPH, 'MATCH (n) RETURN n');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('releases the client even when the query throws', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined) // LOAD 'age'
      .mockResolvedValueOnce(undefined) // SET search_path
      .mockRejectedValueOnce(new Error('query error'));

    const db = buildMockDb();
    await expect(
      executeCypher(db, GRAPH, 'MATCH (n) RETURN n')
    ).rejects.toThrow('query error');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('returns the rows from the result', async () => {
    const rows = [{ result: { id: '1' } }];
    mockQuery
      .mockResolvedValueOnce(undefined) // LOAD 'age'
      .mockResolvedValueOnce(undefined) // SET search_path
      .mockResolvedValueOnce({ rows });

    const db = buildMockDb();
    const result = await executeCypher(db, GRAPH, 'MATCH (n) RETURN n');
    expect(result).toEqual(rows);
  });

  it('uses the graph name in the cypher() call', async () => {
    const db = buildMockDb();
    await executeCypher(db, 'my_graph', 'MATCH (n) RETURN n');

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain("cypher('my_graph'");
  });

  it('passes params as a PostgreSQL $1 parameter (not embedded in SQL string)', async () => {
    const db = buildMockDb();
    const params = { id: 'concept-1', tenantId: 'tenant-1' };
    await executeCypher(db, GRAPH, 'MATCH (n {id: $id}) RETURN n', params);

    // The SQL must contain $1 placeholder (AGE requirement)
    const cypherCallArgs = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('cypher')
    );
    expect(cypherCallArgs?.[0]).toContain('$1');
    // The params JSON is in the pg values array, not the SQL string
    const pgValues = cypherCallArgs?.[1] as string[] | undefined;
    expect(pgValues).toBeDefined();
    const parsed = JSON.parse(pgValues![0]);
    expect(parsed).toMatchObject({ id: 'concept-1', tenantId: 'tenant-1' });
  });

  it('falls back to substituteParams when AGE throws third-argument error (PG17 compat)', async () => {
    const ageError = new Error('third argument of cypher function must be a parameter');
    mockQuery
      .mockResolvedValueOnce(undefined) // LOAD 'age'
      .mockResolvedValueOnce(undefined) // SET search_path
      .mockRejectedValueOnce(ageError)  // first cypher attempt ($1 form) — AGE PG17 error
      .mockResolvedValueOnce({ rows: [{ result: 'ok' }] }); // retry with substituted literals

    const db = buildMockDb();
    const result = await executeCypher(
      db,
      GRAPH,
      'MATCH (n {id: $id}) RETURN n',
      { id: 'concept-1' },
    );

    // Fallback succeeded
    expect(result).toEqual([{ result: 'ok' }]);

    // The retry call must NOT include $1 in the pg values array
    const calls = mockQuery.mock.calls;
    const retrySql = calls[3]![0] as string;
    expect(retrySql).toContain('cypher(');
    // Values were inlined — no pg params array
    expect(calls[3]![1]).toBeUndefined();
    // Substituted literal appears in the query body
    expect(retrySql).toContain('"concept-1"');
  });

  it('re-throws non-AGE errors without retrying', async () => {
    const dbError = new Error('connection reset by peer');
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(dbError);

    const db = buildMockDb();
    await expect(
      executeCypher(db, GRAPH, 'MATCH (n) RETURN n', { tenantId: 't1' }),
    ).rejects.toThrow('connection reset by peer');
  });

  it('does NOT include params placeholder when params is empty object', async () => {
    const db = buildMockDb();
    await executeCypher(db, GRAPH, 'MATCH (n) RETURN n', {});

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    // Empty params → no third argument in cypher() call
    expect(cypherCall).not.toMatch(/cypher\([^)]+,[^)]+,[^)]+\)/);
  });

  it('does NOT include params when params is undefined', async () => {
    const db = buildMockDb();
    await executeCypher(db, GRAPH, 'MATCH (n) RETURN n', undefined);

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    // Should be the simpler 2-argument cypher() form
    expect(cypherCall).toContain("cypher('edusphere_graph'");
    expect(cypherCall).not.toMatch(/"[{]/); // no JSON params appended
  });

  it('safely passes values with single quotes via pg parameter (no escaping needed)', async () => {
    const db = buildMockDb();
    // A value with a single quote — parameterized queries handle it safely without escaping.
    const params = { id: "O'Brien" };
    await executeCypher(db, GRAPH, 'MATCH (n {id: $id}) RETURN n', params);

    const cypherCallArgs = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('cypher')
    );
    // SQL string must use $1 placeholder (no inline JSON with single-quote escaping)
    expect(cypherCallArgs?.[0]).toContain('$1');
    expect(cypherCallArgs?.[0]).not.toContain("O'Brien");
    // Value is safely in the pg values array
    const pgValues = cypherCallArgs?.[1] as string[] | undefined;
    expect(JSON.parse(pgValues![0])).toMatchObject({ id: "O'Brien" });
  });

  it('returns empty array when rows is empty', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] });

    const db = buildMockDb();
    const result = await executeCypher(db, GRAPH, 'MATCH (n) RETURN n');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addVertex
// ---------------------------------------------------------------------------

describe('addVertex()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('calls executeCypher with a CREATE cypher query', async () => {
    const db = buildMockDb();
    await addVertex(db, GRAPH, 'Concept', { name: 'Algebra', tenant_id: 't1' });

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('CREATE');
  });

  it('includes the label in the CREATE clause', async () => {
    const db = buildMockDb();
    await addVertex(db, GRAPH, 'Person', { name: 'Alice' });

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('Person');
  });

  it('embeds the JSON-serialised properties in the query', async () => {
    const db = buildMockDb();
    await addVertex(db, GRAPH, 'Concept', { name: 'Calculus' });

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('"Calculus"');
  });

  it('returns the id from the first result row', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined) // LOAD 'age'
      .mockResolvedValueOnce(undefined) // SET search_path
      .mockResolvedValueOnce({ rows: [{ id: 'vertex-id-1' }] });

    const db = buildMockDb();
    const id = await addVertex(db, GRAPH, 'Concept', { name: 'Test' });
    expect(id).toBe('vertex-id-1');
  });

  it('returns empty string when no rows are returned', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] });

    const db = buildMockDb();
    const id = await addVertex(db, GRAPH, 'Concept', {});
    expect(id).toBe('');
  });
});

// ---------------------------------------------------------------------------
// addEdge
// ---------------------------------------------------------------------------

describe('addEdge()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('calls executeCypher with MATCH and CREATE edge pattern', async () => {
    const db = buildMockDb();
    await addEdge(db, GRAPH, 'node-a', 'node-b', 'RELATED_TO');

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('MATCH');
    expect(cypherCall).toContain('CREATE');
  });

  it('uses $fromId and $toId Cypher params; IDs are in pg values array not SQL', async () => {
    const db = buildMockDb();
    await addEdge(db, GRAPH, 'from-uuid', 'to-uuid', 'RELATED_TO');

    const cypherCallArgs = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('cypher')
    );
    // Cypher body references $fromId / $toId
    expect(cypherCallArgs?.[0]).toContain('$fromId');
    expect(cypherCallArgs?.[0]).toContain('$toId');
    // IDs live in the pg values array (via $1 placeholder), not in the SQL string
    const pgValues = cypherCallArgs?.[1] as string[] | undefined;
    expect(pgValues).toBeDefined();
    const parsed = JSON.parse(pgValues![0]);
    expect(parsed).toMatchObject({ fromId: 'from-uuid', toId: 'to-uuid' });
  });

  it('includes the edge label in the CREATE clause', async () => {
    const db = buildMockDb();
    await addEdge(db, GRAPH, 'a', 'b', 'PREREQUISITE_OF');

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('PREREQUISITE_OF');
  });

  it('includes serialised edge properties in the query', async () => {
    const db = buildMockDb();
    await addEdge(db, GRAPH, 'a', 'b', 'RELATED_TO', { strength: 0.9 });

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('0.9');
  });

  it('works without properties (defaults to empty object)', async () => {
    const db = buildMockDb();
    await expect(
      addEdge(db, GRAPH, 'a', 'b', 'RELATED_TO')
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// queryNodes
// ---------------------------------------------------------------------------

describe('queryNodes()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('calls executeCypher with a MATCH query', async () => {
    const db = buildMockDb();
    await queryNodes(db, GRAPH, 'Concept', { tenant_id: 't1' });

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('MATCH');
  });

  it('includes the label in the MATCH pattern', async () => {
    const db = buildMockDb();
    await queryNodes(db, GRAPH, 'Person');

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('Person');
  });

  it('generates Cypher $key refs in SQL body; values in pg values array', async () => {
    const db = buildMockDb();
    await queryNodes(db, GRAPH, 'Concept', { tenant_id: 't1', name: 'Algebra' });

    const cypherCallArgs = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('cypher')
    );
    // Cypher body uses $key references
    expect(cypherCallArgs?.[0]).toContain('$tenant_id');
    expect(cypherCallArgs?.[0]).toContain('$name');
    // Values are in the pg values array (via $1), not embedded in SQL
    const pgValues = cypherCallArgs?.[1] as string[] | undefined;
    expect(pgValues).toBeDefined();
    const parsed = JSON.parse(pgValues![0]);
    expect(parsed).toMatchObject({ tenant_id: 't1', name: 'Algebra' });
  });

  it('returns the rows from the cypher call', async () => {
    const rows = [{ result: { name: 'Algebra' } }];
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows });

    const db = buildMockDb();
    const result = await queryNodes(db, GRAPH, 'Concept');
    expect(result).toEqual(rows);
  });

  it('works with empty filters (no WHERE clause)', async () => {
    const db = buildMockDb();
    await expect(queryNodes(db, GRAPH, 'Concept')).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// traverse
// ---------------------------------------------------------------------------

describe('traverse()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('calls executeCypher with a MATCH pattern containing the relationship', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'start-id', 'RELATED_TO');

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('RELATED_TO');
  });

  it('uses $startNodeId Cypher ref; value is in pg values array not SQL', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'dangerous-id', 'RELATED_TO');

    const cypherCallArgs = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('cypher')
    );
    expect(cypherCallArgs?.[0]).toContain('$startNodeId');
    // Must NOT be interpolated into the SQL string
    expect(cypherCallArgs?.[0]).not.toContain('dangerous-id');
    // Lives in pg values array
    const pgValues = cypherCallArgs?.[1] as string[] | undefined;
    expect(pgValues).toBeDefined();
    const parsed = JSON.parse(pgValues![0]);
    expect(parsed).toMatchObject({ startNodeId: 'dangerous-id' });
  });

  it('clamps maxDepth of 0 to minimum of 1', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'id', 'REL', 0);

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('1..1');
  });

  it('clamps maxDepth of 20 to maximum of 10', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'id', 'REL', 20);

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('1..10');
  });

  it('uses the provided valid depth when within range', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'id', 'REL', 5);

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('1..5');
  });

  it('truncates fractional depths (e.g. 3.9 → 3)', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'id', 'REL', 3.9);

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('1..3');
  });

  it('uses default depth of 2 when not specified', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'id', 'REL');

    const queryCalls = mockQuery.mock.calls.map((c) => c[0] as string);
    const cypherCall = queryCalls.find((q) => q.includes('cypher'));
    expect(cypherCall).toContain('1..2');
  });

  it('returns the rows from the result', async () => {
    const rows = [{ result: { id: 'related-1' } }];
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows });

    const db = buildMockDb();
    const result = await traverse(db, GRAPH, 'start-id', 'RELATED_TO', 2);
    expect(result).toEqual(rows);
  });

  it('releases pg client after traverse', async () => {
    const db = buildMockDb();
    await traverse(db, GRAPH, 'id', 'REL');
    expect(mockRelease).toHaveBeenCalledOnce();
  });
});

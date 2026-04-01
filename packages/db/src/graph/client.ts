/**
 * Apache AGE graph client — executeCypher and graph operation helpers.
 * Parsing/substitution utilities extracted to cypher-parser.ts.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import {
  toCypherLiteral,
  substituteParams,
  parseAgtypeValue,
  unwrapAgeRow,
} from './cypher-parser';

export type DrizzleDB = NodePgDatabase<Record<string, unknown>>;

// Re-export parser utilities for backward compatibility
export { toCypherLiteral, substituteParams, parseAgtypeValue, unwrapAgeRow };

/**
 * Drizzle stores the underlying pg Pool on the `$client` property.
 */
interface DrizzleWithClient {
  $client: Pool;
}

/**
 * Safely extracts the underlying pg Pool from a DrizzleDB instance.
 */
function extractPool(db: DrizzleDB): Pool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle internal
  return (db as unknown as DrizzleWithClient).$client;
}

/**
 * Execute Apache AGE Cypher query with optional parameterized params.
 *
 * Uses raw pg client (simple query protocol) because LOAD 'age' and
 * SET search_path cannot be combined with SELECT in a prepared statement.
 *
 * AGE 1.7.0 + PostgreSQL 17 compatibility:
 *   1. Try the standard `$1` parameterised form first.
 *   2. On the specific AGE error, retry by substituting values directly
 *      into the Cypher query string as safely-escaped literals.
 */
export async function executeCypher<T = Record<string, unknown>>(
  db: DrizzleDB,
  graphName: string,
  query: string,
  params?: Record<string, unknown>,
  tenantId?: string
): Promise<T[]> {
  const pool = extractPool(db);
  const client = await pool.connect();
  try {
    await client.query("LOAD 'age'");
    await client.query('SET search_path = ag_catalog, "$user", public');

    if (tenantId) {
      await client.query('SELECT set_config($1, $2, TRUE)', [
        'app.current_tenant',
        tenantId,
      ]);
    }

    if (params && Object.keys(params).length > 0) {
      try {
        const result = await client.query(
          `SELECT * FROM cypher('${graphName}', $$${query}$$, $1) AS (result agtype)`,
          [JSON.stringify(params)]
        );
        return result.rows.map((row: Record<string, unknown>) =>
          unwrapAgeRow(row)
        ) as T[];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          !msg.includes('third argument of cypher function must be a parameter')
        ) {
          throw err;
        }
        // Fallback: AGE 1.7.0 + PostgreSQL 17 incompatibility
        const substituted = substituteParams(query, params);
        const result = await client.query(
          `SELECT * FROM cypher('${graphName}', $$${substituted}$$) AS (result agtype)`
        );
        return result.rows.map((row: Record<string, unknown>) =>
          unwrapAgeRow(row)
        ) as T[];
      }
    }

    const result = await client.query(
      `SELECT * FROM cypher('${graphName}', $$${query}$$) AS (result agtype)`
    );
    return result.rows.map((row: Record<string, unknown>) =>
      unwrapAgeRow(row)
    ) as T[];
  } finally {
    client.release();
  }
}

/**
 * Add vertex to graph.
 */
export async function addVertex(
  db: DrizzleDB,
  graphName: string,
  label: string,
  properties: Record<string, unknown>
): Promise<string> {
  const propsJson = JSON.stringify(properties);
  const query = `
    CREATE (v:${label} ${propsJson})
    RETURN v.id::text
  `;
  const result = await executeCypher<string>(db, graphName, query);
  return typeof result[0] === 'string' ? result[0] : String(result[0] ?? '');
}

/**
 * Add edge between two vertices using parameterized IDs.
 */
export async function addEdge(
  db: DrizzleDB,
  graphName: string,
  fromId: string,
  toId: string,
  edgeLabel: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  const propsJson = JSON.stringify(properties);
  const query = `
    MATCH (a {id: $fromId})
    MATCH (b {id: $toId})
    CREATE (a)-[r:${edgeLabel} ${propsJson}]->(b)
  `;
  await executeCypher(db, graphName, query, { fromId, toId });
}

/**
 * Query graph nodes with parameterized filters.
 */
export async function queryNodes<T = Record<string, unknown>>(
  db: DrizzleDB,
  graphName: string,
  label: string,
  filters: Record<string, unknown> = {}
): Promise<T[]> {
  const filterParts = Object.keys(filters)
    .map((key) => `${key}: $${key}`)
    .join(', ');

  const query = `
    MATCH (n:${label} ${filterParts ? `{${filterParts}}` : ''})
    RETURN n
  `;

  return executeCypher<T>(db, graphName, query, filters);
}

/**
 * Traverse graph relationships using a parameterized start node ID.
 */
export async function traverse<T = Record<string, unknown>>(
  db: DrizzleDB,
  graphName: string,
  startNodeId: string,
  relationship: string,
  maxDepth: number = 2
): Promise<T[]> {
  const safeDepth = Math.max(1, Math.min(10, Math.trunc(maxDepth)));
  const query = `
    MATCH (start {id: $startNodeId})-[r:${relationship}*1..${safeDepth}]->(related)
    RETURN related, r
  `;

  return executeCypher<T>(db, graphName, query, { startNodeId });
}

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

export type DrizzleDB = NodePgDatabase<any>;

/**
 * Execute Apache AGE Cypher query with optional parameterized params.
 *
 * Uses raw pg client (simple query protocol) because LOAD 'age' and
 * SET search_path cannot be combined with SELECT in a prepared statement.
 */
export async function executeCypher<T = any>(
  db: DrizzleDB,
  graphName: string,
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const pool = (db as any).$client as Pool;
  const client = await pool.connect();
  try {
    await client.query("LOAD 'age'");
    await client.query('SET search_path = ag_catalog, "$user", public');

    let result;
    if (params && Object.keys(params).length > 0) {
      const paramsJson = JSON.stringify(params).replace(/'/g, "''");
      result = await client.query(
        `SELECT * FROM cypher('${graphName}', $$${query}$$, '${paramsJson}') AS (result agtype)`
      );
    } else {
      result = await client.query(
        `SELECT * FROM cypher('${graphName}', $$${query}$$) AS (result agtype)`
      );
    }
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Add vertex to graph
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
  const result = await executeCypher<{ id: string }>(db, graphName, query);
  return result[0]?.id || '';
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
  // edgeLabel is not user-controlled (comes from internal relationship type enum);
  // fromId/toId are parameterized to prevent injection.
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
export async function queryNodes<T = any>(
  db: DrizzleDB,
  graphName: string,
  label: string,
  filters: Record<string, unknown> = {}
): Promise<T[]> {
  // Build param references for each filter key (e.g. {name: $name, tenant_id: $tenant_id})
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
 * maxDepth is a non-user-controlled integer used in the range literal.
 */
export async function traverse<T = any>(
  db: DrizzleDB,
  graphName: string,
  startNodeId: string,
  relationship: string,
  maxDepth: number = 2
): Promise<T[]> {
  // Clamp maxDepth to a safe integer to prevent abuse of the range literal
  const safeDepth = Math.max(1, Math.min(10, Math.trunc(maxDepth)));
  const query = `
    MATCH (start {id: $startNodeId})-[r:${relationship}*1..${safeDepth}]->(related)
    RETURN related, r
  `;

  return executeCypher<T>(db, graphName, query, { startNodeId });
}

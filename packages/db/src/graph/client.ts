import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type DrizzleDB = NodePgDatabase<any>;

/**
 * Execute Apache AGE Cypher query with optional parameterized params.
 *
 * Apache AGE passes parameters via the third argument to cypher() as an agtype
 * object. Within the Cypher query, reference them as $paramName.
 *
 * Example:
 *   executeCypher(db, graph, 'MATCH (n {id: $id}) RETURN n', { id: myId })
 */
export async function executeCypher<T = any>(
  db: DrizzleDB,
  graphName: string,
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  let result;
  if (params && Object.keys(params).length > 0) {
    // Serialize params as an agtype-compatible JSON literal.
    // We pass the JSON string through sql.raw inside a cast so AGE receives it
    // as agtype, which is the type accepted by cypher()'s third argument.
    const paramsJson = JSON.stringify(params);
    result = await db.execute(sql`
      LOAD 'age';
      SET search_path = ag_catalog, "$user", public;
      SELECT * FROM cypher(${graphName}, $$${sql.raw(query)}$$, ${sql.raw(`'${paramsJson.replace(/'/g, "''")}'`)}) AS (result agtype);
    `);
  } else {
    result = await db.execute(sql`
      LOAD 'age';
      SET search_path = ag_catalog, "$user", public;
      SELECT * FROM cypher(${graphName}, $$${sql.raw(query)}$$) AS (result agtype);
    `);
  }
  return result.rows as T[];
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

import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type DrizzleDB = NodePgDatabase<any>;

/**
 * Execute Apache AGE Cypher query
 */
export async function executeCypher<T = any>(
  db: DrizzleDB,
  graphName: string,
  query: string
): Promise<T[]> {
  const result = await db.execute(sql`
    LOAD 'age';
    SET search_path = ag_catalog, "$user", public;
    SELECT * FROM cypher(${graphName}, $$${sql.raw(query)}$$) AS result;
  `);
  return result.rows as T[];
}

/**
 * Add vertex to graph
 */
export async function addVertex(
  db: DrizzleDB,
  graphName: string,
  label: string,
  properties: Record<string, any>
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
 * Add edge to graph
 */
export async function addEdge(
  db: DrizzleDB,
  graphName: string,
  fromId: string,
  toId: string,
  edgeLabel: string,
  properties: Record<string, any> = {}
): Promise<void> {
  const propsJson = JSON.stringify(properties);
  const query = `
    MATCH (a {id: '${fromId}'})
    MATCH (b {id: '${toId}'})
    CREATE (a)-[r:${edgeLabel} ${propsJson}]->(b)
  `;
  await executeCypher(db, graphName, query);
}

/**
 * Query graph nodes
 */
export async function queryNodes<T = any>(
  db: DrizzleDB,
  graphName: string,
  label: string,
  filters: Record<string, any> = {}
): Promise<T[]> {
  const filterStr = Object.entries(filters)
    .map(([key, value]) => `${key}: '${value}'`)
    .join(', ');

  const query = `
    MATCH (n:${label} ${filterStr ? `{${filterStr}}` : ''})
    RETURN n
  `;

  return executeCypher<T>(db, graphName, query);
}

/**
 * Traverse graph relationships
 */
export async function traverse<T = any>(
  db: DrizzleDB,
  graphName: string,
  startNodeId: string,
  relationship: string,
  maxDepth: number = 2
): Promise<T[]> {
  const query = `
    MATCH (start {id: '${startNodeId}'})-[r:${relationship}*1..${maxDepth}]->(related)
    RETURN related, r
  `;

  return executeCypher<T>(db, graphName, query);
}

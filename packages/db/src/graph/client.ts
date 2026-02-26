import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

export type DrizzleDB = NodePgDatabase<any>;

/**
 * Convert a JS value to a safe Cypher literal string.
 *
 * - Strings are double-quoted and internal double-quotes / backslashes are escaped.
 * - Numbers and booleans are stringified as-is.
 * - null / undefined become the Cypher `null` keyword.
 *
 * This is used by substituteParams() when the AGE third-argument parameterisation
 * fails (AGE 1.7.0 + PostgreSQL 17 incompatibility — see executeCypher).
 */
export function toCypherLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `"${escaped}"`;
}

/**
 * Replace Cypher `$paramName` references with safe literal values.
 *
 * Only replaces `$word` tokens that exist as keys in `params`.
 * Unknown `$token` references are left untouched so any remaining ones
 * surface as an AGE "undefined parameter" error rather than silently
 * producing wrong results.
 */
export function substituteParams(
  query: string,
  params: Record<string, unknown>
): string {
  return query.replace(/\$([A-Za-z_]\w*)/g, (match, key) => {
    if (!(key in params)) return match;
    return toCypherLiteral(params[key]);
  });
}

/**
 * Execute Apache AGE Cypher query with optional parameterized params.
 *
 * Uses raw pg client (simple query protocol) because LOAD 'age' and
 * SET search_path cannot be combined with SELECT in a prepared statement.
 *
 * When tenantId is provided, issues set_config() before the Cypher query
 * so that AGE 1.7.0 RLS policies on label tables enforce tenant isolation
 * at the database layer in addition to the tenant_id property filter inside
 * the Cypher WHERE clause.
 *
 * AGE 1.7.0 + PostgreSQL 17 compatibility note
 * ─────────────────────────────────────────────
 * AGE's cypher() planner hook requires the third argument to be a raw Param
 * node (i.e. `$1` in SQL).  On PostgreSQL 17 this check fails even when the
 * caller correctly passes `$1` via the extended query protocol — a known
 * AGE 1.7.0 / PG-17 incompatibility.  We therefore:
 *   1. Try the standard `$1` parameterised form first.
 *   2. On the specific AGE error, retry by substituting values directly into
 *      the Cypher query string as safely-escaped literals (substituteParams).
 * Once the stack is upgraded to AGE ≥1.9 (which supports PG 17) the fallback
 * branch will never be reached and can be removed.
 */
export async function executeCypher<T = any>(
  db: DrizzleDB,
  graphName: string,
  query: string,
  params?: Record<string, unknown>,
  tenantId?: string
): Promise<T[]> {
  const pool = (db as any).$client as Pool;
  const client = await pool.connect();
  try {
    await client.query("LOAD 'age'");
    await client.query('SET search_path = ag_catalog, "$user", public');

    if (tenantId) {
      // Use parameterized set_config to avoid injection.
      await client.query('SELECT set_config($1, $2, TRUE)', [
        'app.current_tenant',
        tenantId,
      ]);
    }

    if (params && Object.keys(params).length > 0) {
      try {
        // Primary path: AGE third-argument parameterisation ($1 = JSON params).
        // Requires AGE ≥1.9 on PostgreSQL 17; works on AGE 1.7 + PG 16.
        const result = await client.query(
          `SELECT * FROM cypher('${graphName}', $$${query}$$, $1) AS (result agtype)`,
          [JSON.stringify(params)]
        );
        return result.rows as T[];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          !msg.includes('third argument of cypher function must be a parameter')
        ) {
          throw err;
        }
        // Fallback: AGE 1.7.0 + PostgreSQL 17 cannot use the $1 form.
        // Substitute values as safe Cypher literals and use the 2-argument form.
        const substituted = substituteParams(query, params);
        const result = await client.query(
          `SELECT * FROM cypher('${graphName}', $$${substituted}$$) AS (result agtype)`
        );
        return result.rows as T[];
      }
    }

    const result = await client.query(
      `SELECT * FROM cypher('${graphName}', $$${query}$$) AS (result agtype)`
    );
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

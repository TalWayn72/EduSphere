/**
 * cypher-age-helpers.ts — Apache AGE low-level query helpers shared across
 * CypherLearningPathService (and any future multi-column AGE query services).
 *
 * Exported as plain functions (not a class) so they can be imported without DI.
 * None of these functions accept user-supplied values — callers must sanitize.
 */
import { Logger } from '@nestjs/common';
import { substituteParams } from '@edusphere/db';
import type { Pool, PoolClient } from 'pg';
import { graphConfig } from '@edusphere/config';
import type { db as DrizzleDb } from '@edusphere/db';

const GRAPH_NAME = graphConfig.graphName;
const log = new Logger('CypherAgeHelpers');

/** Parse a single AGE agtype scalar value to a JS primitive. */
export function parseAgtypeScalar(
  raw: string | number | null | undefined
): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw)
    .replace(/::[\w]+$/, '')
    .trim();
  const n = Number(cleaned);
  return Number.isNaN(n) ? cleaned : n;
}

/** Parse an AGE agtype array value to a JS array. */
export function parseAgtypeArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const cleaned = String(raw)
      .replace(/::[\w]+(?=[,\}\]])/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    log.warn({ err, raw }, 'parseAgtypeArray: failed to parse agtype array');
    return [];
  }
}

/** Acquire a PostgreSQL client from the Drizzle pool, LOAD age, and set tenant. */
export async function acquireAgeClient(
  db: typeof DrizzleDb,
  tenantId: string
): Promise<PoolClient> {
  const pool = (db as { $client: Pool }).$client;
  const client = await pool.connect();
  await client.query("LOAD 'age'");
  await client.query('SET search_path = ag_catalog, "$user", public');
  await client.query('SELECT set_config($1, $2, TRUE)', [
    'app.current_tenant',
    tenantId,
  ]);
  return client;
}

/** Execute a multi-column AGE Cypher query with primary/fallback strategy. */
export async function runAgeQuery<T extends Record<string, string>>(
  client: PoolClient,
  cypherQuery: string,
  cypherParams: Record<string, unknown>,
  asClause: string
): Promise<T[]> {
  try {
    const q = `SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$${cypherQuery}$$, $1) ${asClause}`;
    const result = await client.query(q, [JSON.stringify(cypherParams)]);
    return result.rows as T[];
  } catch (ageErr) {
    const msg = ageErr instanceof Error ? ageErr.message : String(ageErr);
    if (!msg.includes('third argument of cypher function must be a parameter'))
      throw ageErr;
    const substituted = substituteParams(cypherQuery, cypherParams);
    const qDirect = `SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$${substituted}$$) ${asClause}`;
    const result = await client.query(qDirect);
    return result.rows as T[];
  }
}

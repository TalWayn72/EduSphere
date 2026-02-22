/**
 * Read/Write Split Helper — Drizzle ORM
 * Routes read queries to a replica pool and write queries to the primary.
 *
 * Configuration:
 *   REPLICA_DATABASE_URL — set to replica connection string to enable splitting.
 *   If unset, all queries fall back to the primary (safe default).
 *
 * Memory Safety: Uses getOrCreatePool() — never creates raw Pool instances.
 * SI-8: All DB access via getOrCreatePool() from @edusphere/db (this file).
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../schema/index.js';
import { getOrCreatePool } from '../index.js';

// ---------------------------------------------------------------------------
// Pool accessors
// ---------------------------------------------------------------------------

/**
 * Returns the read replica pool.
 * Falls back to the primary pool when REPLICA_DATABASE_URL is not configured.
 * Emits a one-time warning on fallback so ops can detect misconfiguration.
 */
let _replicaWarningEmitted = false;

export function getReadPool() {
  const replicaUrl = process.env['REPLICA_DATABASE_URL'];

  if (!replicaUrl) {
    if (!_replicaWarningEmitted) {
      process.stderr.write(
        '[db/readReplica] REPLICA_DATABASE_URL not set — ' +
          'read queries will use the primary pool. ' +
          'Set REPLICA_DATABASE_URL in production to enable read/write split.\n',
      );
      _replicaWarningEmitted = true;
    }
    return getOrCreatePool();
  }

  return getOrCreatePool(replicaUrl);
}

/**
 * Always returns the primary pool regardless of replica configuration.
 * Use for all INSERT / UPDATE / DELETE / DDL operations.
 */
export function getWritePool() {
  return getOrCreatePool();
}

// ---------------------------------------------------------------------------
// Drizzle connection factories
// ---------------------------------------------------------------------------

/** Drizzle instance backed by the read replica (or primary fallback). */
export function createReadConnection() {
  return drizzle(getReadPool(), { schema });
}

/** Drizzle instance backed by the primary (write) pool. */
export function createWriteConnection() {
  return drizzle(getWritePool(), { schema });
}

// ---------------------------------------------------------------------------
// Execution helper
// ---------------------------------------------------------------------------

/**
 * Executes a read-only callback against the replica connection.
 *
 * @example
 * const courses = await withReadReplica((db) =>
 *   db.select().from(schema.courses).where(eq(schema.courses.tenantId, tenantId))
 * );
 */
export async function withReadReplica<T>(
  fn: (db: ReturnType<typeof createReadConnection>) => Promise<T>,
): Promise<T> {
  const db = createReadConnection();
  return fn(db);
}

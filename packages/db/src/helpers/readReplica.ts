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
 *
 * Singleton: Drizzle instances are created once (lazy) and reused.
 * Call closeReadReplica() on shutdown to release the cached instance.
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
          'Set REPLICA_DATABASE_URL in production to enable read/write split.\n'
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
// Lazy singleton Drizzle instances
// ---------------------------------------------------------------------------

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let _readDb: DrizzleClient | null = null;
let _writeDb: DrizzleClient | null = null;

/** Returns the singleton Drizzle instance backed by the read replica. */
export function getReadDb(): DrizzleClient {
  if (!_readDb) {
    _readDb = drizzle(getReadPool(), { schema });
  }
  return _readDb;
}

/** Returns the singleton Drizzle instance backed by the primary pool. */
export function getWriteDb(): DrizzleClient {
  if (!_writeDb) {
    _writeDb = drizzle(getWritePool(), { schema });
  }
  return _writeDb;
}

/**
 * Releases cached Drizzle instances so they can be recreated on next access.
 * Call during OnModuleDestroy or graceful shutdown.
 * Note: the underlying Pool is managed by getOrCreatePool / closeAllPools.
 */
export function closeReadReplica(): void {
  _readDb = null;
  _writeDb = null;
}

// ---------------------------------------------------------------------------
// Backward-compatible factories (now return singletons)
// ---------------------------------------------------------------------------

/** @deprecated Use getReadDb() instead. Kept for backward compatibility. */
export function createReadConnection() {
  return getReadDb();
}

/** @deprecated Use getWriteDb() instead. Kept for backward compatibility. */
export function createWriteConnection() {
  return getWriteDb();
}

// ---------------------------------------------------------------------------
// Execution helper
// ---------------------------------------------------------------------------

/**
 * Executes a read-only callback against the replica connection.
 * Uses the singleton read Drizzle instance (no new instance per call).
 *
 * @example
 * const courses = await withReadReplica((db) =>
 *   db.select().from(schema.courses).where(eq(schema.courses.tenantId, tenantId))
 * );
 */
export async function withReadReplica<T>(
  fn: (db: DrizzleClient) => Promise<T>
): Promise<T> {
  return fn(getReadDb());
}

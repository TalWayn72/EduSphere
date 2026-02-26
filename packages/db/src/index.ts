import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
export {
  sql,
  eq,
  and,
  or,
  not,
  desc,
  asc,
  inArray,
  lte,
  gte,
  lt,
  gt,
  ne,
  isNotNull,
  isNull,
} from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Singleton pool registry — one Pool per unique connection string
// ---------------------------------------------------------------------------
const _pools: Map<string, Pool> = new Map();

export function getOrCreatePool(connectionString?: string): Pool {
  const key = connectionString || process.env.DATABASE_URL || '__default__';
  if (_pools.has(key)) {
    return _pools.get(key) as Pool;
  }
  const pool = new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  _pools.set(key, pool);
  return pool;
}

export async function closeAllPools(): Promise<void> {
  const results = await Promise.allSettled(
    Array.from(_pools.values()).map((pool) => pool.end())
  );
  _pools.clear();
  for (const result of results) {
    if (result.status === 'rejected') {
      // Log but do not rethrow — we want all pools drained regardless
      process.stderr.write(
        `[db] pool.end() error during shutdown: ${String(result.reason)}\n`
      );
    }
  }
}

// Register OS signal handlers once so duplicate handler registrations are
// avoided when this module is hot-reloaded in tests.
process.once('SIGINT', () => {
  closeAllPools().finally(() => process.exit(0));
});
process.once('SIGTERM', () => {
  closeAllPools().finally(() => process.exit(0));
});
process.once('SIGUSR2', () => {
  // nodemon sends SIGUSR2 for graceful restart
  closeAllPools().finally(() => process.exit(0));
});

// ---------------------------------------------------------------------------
// Database connection helper (backward-compatible API)
// ---------------------------------------------------------------------------
export function createDatabaseConnection(connectionString?: string) {
  const pool = getOrCreatePool(connectionString);
  return drizzle(pool, { schema });
}

// Export schema
export { schema };
export * from './schema';

// Export types
export type Database = ReturnType<typeof createDatabaseConnection>;
export type DrizzleDB = Database;

// Default connection
export const db = createDatabaseConnection();

// Export graph utilities
export * from './graph';

// Export RLS utilities
export * from './rls';

// Export read/write replica helpers
export { withReadReplica, createReadConnection, createWriteConnection } from './helpers/readReplica.js';

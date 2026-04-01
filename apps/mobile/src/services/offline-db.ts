/**
 * offline-db.ts — Tenant-scoped offline cache using expo-sqlite.
 * Each tenant gets its own SQLite database for data isolation.
 * On tenant switch: close current DB, open new one.
 */
import * as SQLite from 'expo-sqlite';

/** Active database instances keyed by tenant slug. */
const activeDatabases = new Map<string, SQLite.SQLiteDatabase>();

/** Build a database filename for a tenant. */
export function buildDatabaseName(tenantSlug: string): string {
  // Sanitize slug: allow only alphanumeric, hyphens, underscores
  const safe = tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `edusphere-${safe}.db`;
}

/**
 * Get or create a tenant-scoped SQLite database.
 * Reuses existing connections for the same slug.
 */
export async function getDatabase(
  tenantSlug: string
): Promise<SQLite.SQLiteDatabase> {
  const existing = activeDatabases.get(tenantSlug);
  if (existing) return existing;

  const dbName = buildDatabaseName(tenantSlug);
  const db = await SQLite.openDatabaseAsync(dbName);

  // Create base tables for offline cache
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_queries (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      variables TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_mutations (
      id TEXT PRIMARY KEY,
      mutation TEXT NOT NULL,
      variables TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS idx_cq_timestamp ON cached_queries(timestamp);
    CREATE INDEX IF NOT EXISTS idx_om_status ON offline_mutations(status);
  `);

  activeDatabases.set(tenantSlug, db);
  return db;
}

/**
 * Close the database for a specific tenant.
 * Call this on tenant switch before opening a new one.
 */
export async function closeTenantDatabase(tenantSlug: string): Promise<void> {
  const db = activeDatabases.get(tenantSlug);
  if (!db) return;
  activeDatabases.delete(tenantSlug);
  // expo-sqlite v16 closeAsync if available, otherwise just remove reference
  if ('closeAsync' in db && typeof db.closeAsync === 'function') {
    await (db as unknown as { closeAsync: () => Promise<void> }).closeAsync();
  }
}

/**
 * Delete a tenant's local database file.
 * Closes the connection first if open.
 */
export async function clearTenantCache(tenantSlug: string): Promise<void> {
  await closeTenantDatabase(tenantSlug);
  const dbName = buildDatabaseName(tenantSlug);
  // expo-sqlite v16: deleteDatabaseAsync
  if (
    'deleteDatabaseAsync' in SQLite &&
    typeof SQLite.deleteDatabaseAsync === 'function'
  ) {
    await (
      SQLite as unknown as {
        deleteDatabaseAsync: (name: string) => Promise<void>;
      }
    ).deleteDatabaseAsync(dbName);
  }
}

/**
 * Switch to a different tenant's database.
 * Closes current tenant DB, opens the new one.
 */
export async function switchTenantDatabase(
  fromSlug: string | null,
  toSlug: string
): Promise<SQLite.SQLiteDatabase> {
  if (fromSlug && fromSlug !== toSlug) {
    await closeTenantDatabase(fromSlug);
  }
  return getDatabase(toSlug);
}

/** Get count of active database connections (for testing/diagnostics). */
export function getActiveDatabaseCount(): number {
  return activeDatabases.size;
}

/** Close all active databases (cleanup on app shutdown). */
export async function closeAllDatabases(): Promise<void> {
  const slugs = Array.from(activeDatabases.keys());
  for (const slug of slugs) {
    await closeTenantDatabase(slug);
  }
}

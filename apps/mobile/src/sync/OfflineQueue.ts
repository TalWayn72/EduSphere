/**
 * Offline mutation queue backed by expo-sqlite.
 * Mutations queued while offline are replayed in order when connectivity is restored.
 * Memory-safe: no unbounded growth — capped at MAX_QUEUE_SIZE entries (LRU eviction by created_at).
 * SOC2 CC6.1, GDPR Art.32: queue stored locally, never transmitted unencrypted.
 */
import * as SQLite from 'expo-sqlite';

export interface QueuedMutation {
  id: string;
  operationName: string;
  query: string;
  variables: Record<string, unknown>;
  tenantId: string;
  userId: string;
  createdAt: number; // epoch ms
  retryCount: number;
}

const MAX_QUEUE_SIZE = 500; // memory / storage guard
const DB_NAME = 'edusphere_offline.db';

let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
    _db.execSync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        operation_name TEXT NOT NULL,
        query TEXT NOT NULL,
        variables TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_offline_queue_created ON offline_queue(created_at ASC);
      CREATE TABLE IF NOT EXISTS offline_conflicts (
        id TEXT PRIMARY KEY,
        operation_name TEXT NOT NULL,
        failed_at INTEGER NOT NULL,
        retry_count INTEGER NOT NULL,
        error_reason TEXT NOT NULL
      );
    `);
  }
  return _db;
}

export function enqueue(mutation: Omit<QueuedMutation, 'retryCount'>): void {
  const db = getDb();
  // Evict oldest if at capacity
  const count =
    db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM offline_queue')
      ?.c ?? 0;
  if (count >= MAX_QUEUE_SIZE) {
    db.runSync(
      'DELETE FROM offline_queue WHERE id = (SELECT id FROM offline_queue ORDER BY created_at ASC LIMIT 1)'
    );
  }
  db.runSync(
    'INSERT OR REPLACE INTO offline_queue (id, operation_name, query, variables, tenant_id, user_id, created_at, retry_count) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    [
      mutation.id,
      mutation.operationName,
      mutation.query,
      JSON.stringify(mutation.variables),
      mutation.tenantId,
      mutation.userId,
      mutation.createdAt,
    ]
  );
}

export function dequeue(id: string): void {
  getDb().runSync('DELETE FROM offline_queue WHERE id = ?', [id]);
}

export function peek(limit = 10): QueuedMutation[] {
  const rows = getDb().getAllSync<{
    id: string;
    operation_name: string;
    query: string;
    variables: string;
    tenant_id: string;
    user_id: string;
    created_at: number;
    retry_count: number;
  }>('SELECT * FROM offline_queue ORDER BY created_at ASC LIMIT ?', [limit]);
  return rows.map((r) => ({
    id: r.id,
    operationName: r.operation_name,
    query: r.query,
    variables: JSON.parse(r.variables) as Record<string, unknown>,
    tenantId: r.tenant_id,
    userId: r.user_id,
    createdAt: r.created_at,
    retryCount: r.retry_count,
  }));
}

export function incrementRetry(id: string): void {
  getDb().runSync(
    'UPDATE offline_queue SET retry_count = retry_count + 1 WHERE id = ?',
    [id]
  );
}

export function queueSize(): number {
  return (
    getDb().getFirstSync<{ c: number }>(
      'SELECT COUNT(*) as c FROM offline_queue'
    )?.c ?? 0
  );
}

export function clearAll(): void {
  getDb().runSync('DELETE FROM offline_queue');
}

export interface ConflictedMutation {
  id: string;
  operationName: string;
  failedAt: number;
  retryCount: number;
  errorReason: string;
}

export function addConflict(
  mutation: QueuedMutation,
  errorReason: string
): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO offline_conflicts (id, operation_name, failed_at, retry_count, error_reason) VALUES (?, ?, ?, ?, ?)',
    [
      mutation.id,
      mutation.operationName,
      Date.now(),
      mutation.retryCount,
      errorReason,
    ]
  );
}

export function getConflicts(): ConflictedMutation[] {
  const rows = getDb().getAllSync<{
    id: string;
    operation_name: string;
    failed_at: number;
    retry_count: number;
    error_reason: string;
  }>('SELECT * FROM offline_conflicts ORDER BY failed_at DESC');
  return rows.map((r) => ({
    id: r.id,
    operationName: r.operation_name,
    failedAt: r.failed_at,
    retryCount: r.retry_count,
    errorReason: r.error_reason,
  }));
}

export function resolveConflict(id: string): void {
  getDb().runSync('DELETE FROM offline_conflicts WHERE id = ?', [id]);
}

export function conflictCount(): number {
  return (
    getDb().getFirstSync<{ c: number }>(
      'SELECT COUNT(*) as c FROM offline_conflicts'
    )?.c ?? 0
  );
}

/** Call on app teardown to close the SQLite connection. */
export function closeOfflineDb(): void {
  _db?.closeSync();
  _db = null;
}

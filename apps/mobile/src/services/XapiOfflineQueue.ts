import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('xapi_queue.db');

export type QueuedStatement = {
  id: string;
  tenant_id: string;
  payload: string;
  created_at: number;
};

export function initXapiQueue(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS xapi_queue (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_xapi_created ON xapi_queue(created_at);
  `);
}

export function enqueueStatement(tenantId: string, stmt: object): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  db.runSync(
    'INSERT INTO xapi_queue VALUES (?, ?, ?, ?)',
    [id, tenantId, JSON.stringify(stmt), Date.now()],
  );
  evictOldStatements();
}

export function getPendingStatements(limit = 50): QueuedStatement[] {
  return db.getAllSync<QueuedStatement>(
    'SELECT * FROM xapi_queue ORDER BY created_at ASC LIMIT ?',
    [limit],
  );
}

export function deleteStatements(ids: string[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  db.runSync(`DELETE FROM xapi_queue WHERE id IN (${placeholders})`, ids);
}

// Memory Safety: cap at 500 rows to prevent unbounded SQLite growth
export function evictOldStatements(): void {
  db.runSync(`
    DELETE FROM xapi_queue WHERE id IN (
      SELECT id FROM xapi_queue ORDER BY created_at ASC
      LIMIT MAX(0, (SELECT COUNT(*) FROM xapi_queue) - 500)
    )
  `);
}

export function getQueueSize(): number {
  const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM xapi_queue');
  return result?.count ?? 0;
}

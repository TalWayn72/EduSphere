import { getDb } from './db.js';

export interface LockResult {
  locked: boolean;
  owner?: string;
}

export interface LockInfo {
  locked: boolean;
  owner?: string;
  expires_at?: number;
}

function cleanExpiredLocks(): void {
  const db = getDb();
  const now = Date.now() / 1000;
  db.prepare('DELETE FROM locks WHERE expires_at < ?').run(now);
}

export function acquireLock(
  path: string,
  agentId: string,
  ttlMs: number = 300_000,
): LockResult {
  const db = getDb();
  cleanExpiredLocks();

  const now = Date.now() / 1000;
  const expiresAt = now + ttlMs / 1000;

  const existing = db
    .prepare('SELECT agent_id FROM locks WHERE path = ?')
    .get(path) as { agent_id: string } | undefined;

  if (existing) {
    return { locked: false, owner: existing.agent_id };
  }

  db.prepare(
    'INSERT INTO locks (path, agent_id, acquired_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(path, agentId, now, expiresAt);

  return { locked: true, owner: agentId };
}

export function releaseLock(
  path: string,
  agentId: string,
): { released: boolean } {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM locks WHERE path = ? AND agent_id = ?')
    .run(path, agentId);

  return { released: result.changes > 0 };
}

export function checkLock(path: string): LockInfo {
  const db = getDb();
  cleanExpiredLocks();

  const row = db
    .prepare('SELECT agent_id, expires_at FROM locks WHERE path = ?')
    .get(path) as { agent_id: string; expires_at: number } | undefined;

  if (!row) {
    return { locked: false };
  }

  return { locked: true, owner: row.agent_id, expires_at: row.expires_at };
}

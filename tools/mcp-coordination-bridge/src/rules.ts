import { getDb } from './db.js';

export interface Violation {
  id: number;
  agent_id: string;
  rule: string;
  details: string | null;
  ts: number;
}

export function logViolation(
  agentId: string,
  rule: string,
  details?: string
): Violation {
  const db = getDb();
  const now = Date.now() / 1000;
  const stmt = db.prepare(
    'INSERT INTO violations (agent_id, rule, details, ts) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(agentId, rule, details ?? null, now);

  return db
    .prepare('SELECT * FROM violations WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Violation;
}

export function getViolations(agentId?: string, since?: number): Violation[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (agentId) {
    conditions.push('agent_id = ?');
    params.push(agentId);
  }

  if (since !== undefined) {
    conditions.push('ts > ?');
    params.push(since);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(`SELECT * FROM violations ${where} ORDER BY ts DESC`)
    .all(...params) as Violation[];
}

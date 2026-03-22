import { getDb } from './db.js';

export type AgentStatus =
  | 'registered'
  | 'running'
  | 'blocked'
  | 'complete'
  | 'failed';

export interface AgentRecord {
  id: string;
  division: string;
  role: string;
  status: AgentStatus;
  last_seen: number;
}

const VALID_STATUSES: Set<string> = new Set([
  'registered',
  'running',
  'blocked',
  'complete',
  'failed',
]);

export function registerAgent(
  id: string,
  division: string,
  role: string,
): AgentRecord {
  const db = getDb();
  const now = Date.now() / 1000;
  db.prepare(
    `INSERT INTO agents (id, division, role, status, last_seen)
     VALUES (?, ?, ?, 'registered', ?)
     ON CONFLICT(id) DO UPDATE SET
       division = excluded.division,
       role = excluded.role,
       last_seen = ?`,
  ).run(id, division, role, now, now);

  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRecord;
}

export function updateStatus(
  id: string,
  status: string,
): AgentRecord | null {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(
      `Invalid status "${status}". Must be one of: ${[...VALID_STATUSES].join(', ')}`,
    );
  }

  const db = getDb();
  const now = Date.now() / 1000;
  const result = db
    .prepare(
      `UPDATE agents SET status = ?, last_seen = ? WHERE id = ?`,
    )
    .run(status, now, id);

  if (result.changes === 0) return null;

  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRecord;
}

export function getAgents(): AgentRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM agents ORDER BY division, id').all() as AgentRecord[];
}

export function getDivisionStatus(division: string): AgentRecord[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM agents WHERE division = ? ORDER BY id')
    .all(division) as AgentRecord[];
}

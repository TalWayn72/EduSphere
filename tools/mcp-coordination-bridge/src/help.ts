import { getDb } from './db.js';

export interface HelpRequest {
  id: number;
  from_agent: string;
  to_division: string;
  query: string;
  response: string | null;
  status: string;
  ts: number;
}

export function requestHelp(
  fromAgent: string,
  toDivision: string,
  query: string,
): HelpRequest {
  const db = getDb();
  const now = Date.now() / 1000;
  const stmt = db.prepare(
    'INSERT INTO help_requests (from_agent, to_division, query, ts) VALUES (?, ?, ?, ?)',
  );
  const result = stmt.run(fromAgent, toDivision, query, now);

  return db
    .prepare('SELECT * FROM help_requests WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as HelpRequest;
}

export function respondHelp(
  id: number,
  response: string,
): HelpRequest | null {
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE help_requests SET response = ?, status = 'responded' WHERE id = ?`,
    )
    .run(response, id);

  if (result.changes === 0) return null;

  return db
    .prepare('SELECT * FROM help_requests WHERE id = ?')
    .get(id) as HelpRequest;
}

export function getPendingHelp(division?: string): HelpRequest[] {
  const db = getDb();

  if (division) {
    return db
      .prepare(
        `SELECT * FROM help_requests
         WHERE to_division = ? AND status IN ('pending', 'responded')
         ORDER BY ts DESC`,
      )
      .all(division) as HelpRequest[];
  }

  return db
    .prepare(
      `SELECT * FROM help_requests
       WHERE status IN ('pending', 'responded')
       ORDER BY ts DESC`,
    )
    .all() as HelpRequest[];
}

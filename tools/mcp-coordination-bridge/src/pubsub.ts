import { getDb } from './db.js';

let publishCount = 0;
const PRUNE_INTERVAL = 100;
const PRUNE_AGE_DAYS = 7;

export interface Event {
  id: number;
  channel: string;
  agent_id: string;
  payload: string;
  ts: number;
}

export function publish(
  channel: string,
  agentId: string,
  payload: string,
): { id: number } {
  const db = getDb();
  const now = Date.now() / 1000;
  const stmt = db.prepare(
    'INSERT INTO events (channel, agent_id, payload, ts) VALUES (?, ?, ?, ?)',
  );
  const result = stmt.run(channel, agentId, payload, now);

  publishCount++;
  if (publishCount % PRUNE_INTERVAL === 0) {
    pruneOldEvents();
  }

  return { id: Number(result.lastInsertRowid) };
}

export function subscribe(channel: string, since?: number): Event[] {
  const db = getDb();

  if (since !== undefined) {
    const stmt = db.prepare(
      'SELECT id, channel, agent_id, payload, ts FROM events WHERE channel = ? AND ts > ? ORDER BY ts ASC',
    );
    return stmt.all(channel, since) as Event[];
  }

  const stmt = db.prepare(
    'SELECT id, channel, agent_id, payload, ts FROM events WHERE channel = ? ORDER BY ts ASC',
  );
  return stmt.all(channel) as Event[];
}

function pruneOldEvents(): void {
  const db = getDb();
  const cutoff = Date.now() / 1000 - PRUNE_AGE_DAYS * 86400;
  db.prepare('DELETE FROM events WHERE ts < ?').run(cutoff);
}

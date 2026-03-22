import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_channel_ts ON events(channel, ts);

CREATE TABLE IF NOT EXISTS locks (
  path TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  acquired_at REAL NOT NULL,
  expires_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  division TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered',
  last_seen REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agents_division ON agents(division);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  rule TEXT NOT NULL,
  details TEXT,
  ts REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS help_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_agent TEXT NOT NULL,
  to_division TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ts REAL NOT NULL
);
`;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env['BRIDGE_DB_PATH'] || '.hivemind/coordination.db';
  const dir = dirname(dbPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

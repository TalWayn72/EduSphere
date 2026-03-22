import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts REAL NOT NULL DEFAULT (unixepoch('now','subsec'))
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
  last_seen REAL NOT NULL DEFAULT (unixepoch('now','subsec'))
);
CREATE INDEX IF NOT EXISTS idx_agents_division ON agents(division);
CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  rule TEXT NOT NULL,
  details TEXT,
  ts REAL NOT NULL DEFAULT (unixepoch('now','subsec'))
);
CREATE TABLE IF NOT EXISTS help_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_agent TEXT NOT NULL,
  to_division TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ts REAL NOT NULL DEFAULT (unixepoch('now','subsec'))
);
`;

/** Shared in-memory DB instance for the current test. */
export let testDb: Database.Database;

export function createTestDb(): Database.Database {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.exec(SCHEMA);
  return testDb;
}

export function closeTestDb(): void {
  if (testDb) testDb.close();
}

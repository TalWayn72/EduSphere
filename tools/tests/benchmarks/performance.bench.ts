import { describe, bench, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, closeTestDb } from '../../mcp-coordination-bridge/tests/helpers.js';

let db: Database.Database;

vi.mock('../../mcp-coordination-bridge/src/db.js', () => ({
  getDb: () => db,
  closeDb: () => {},
}));

const { publish, subscribe } = await import('../../mcp-coordination-bridge/src/pubsub.js');
const { acquireLock } = await import('../../mcp-coordination-bridge/src/locks.js');

let counter = 0;

beforeEach(() => {
  db = createTestDb();
  counter = 0;
});

afterEach(() => {
  closeTestDb();
});

describe('SQLite publish latency', () => {
  bench('publish single event (target: <5ms)', () => {
    publish('bench-channel', 'bench-agent', `{"i":${counter++}}`);
  });
});

describe('SQLite subscribe latency', () => {
  bench('subscribe 100 events (target: <10ms)', () => {
    if (counter === 0) {
      for (let i = 0; i < 100; i++) publish('sub-bench', 'agent', `{"i":${i}}`);
      counter = 1;
    }
    subscribe('sub-bench');
  });
});

describe('SQLite lock acquire latency', () => {
  bench('acquire lock on unique path (target: <3ms)', () => {
    acquireLock(`path/file-${counter++}.ts`, 'agent-1');
  });
});

describe('SQLite concurrent reads', () => {
  bench('10 parallel subscribes on same channel', () => {
    if (counter === 0) {
      for (let i = 0; i < 50; i++) publish('concurrent', 'agent', `{"i":${i}}`);
      counter = 1;
    }
    const results = Array.from({ length: 10 }, () => subscribe('concurrent'));
    for (const r of results) {
      if (r.length !== 50) throw new Error('Mismatch');
    }
  });
});

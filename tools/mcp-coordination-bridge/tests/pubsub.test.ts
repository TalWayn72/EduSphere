import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, closeTestDb } from './helpers.js';

let db: Database.Database;

vi.mock('../src/db.js', () => ({
  getDb: () => db,
  closeDb: () => {},
}));

const { publish, subscribe } = await import('../src/pubsub.js');

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb();
});

describe('publish', () => {
  it('inserts an event and returns its id', () => {
    const result = publish('fe:ready', 'agent-1', '{"msg":"hello"}');
    expect(result.id).toBeGreaterThan(0);
  });
});

describe('subscribe', () => {
  it('returns published events on the same channel', () => {
    publish('fe:ready', 'agent-1', '{"step":1}');
    publish('fe:ready', 'agent-1', '{"step":2}');
    const events = subscribe('fe:ready');
    expect(events).toHaveLength(2);
    expect(events[0].payload).toBe('{"step":1}');
    expect(events[1].payload).toBe('{"step":2}');
  });

  it('filters by channel -- events on other channels excluded', () => {
    publish('fe:ready', 'agent-1', '{"a":1}');
    publish('be:ready', 'agent-2', '{"b":2}');
    expect(subscribe('fe:ready')).toHaveLength(1);
    expect(subscribe('be:ready')).toHaveLength(1);
    expect(subscribe('fe:ready')[0].agent_id).toBe('agent-1');
  });

  it('filters by timestamp with since parameter', () => {
    // Insert first event with an explicit past timestamp for deterministic test
    const pastTs = Date.now() / 1000 - 60;
    db.prepare('INSERT INTO events (channel, agent_id, payload, ts) VALUES (?, ?, ?, ?)').run('ch', 'a1', 'first', pastTs);
    publish('ch', 'a1', 'second');
    const newEvents = subscribe('ch', pastTs);
    expect(newEvents).toHaveLength(1);
    expect(newEvents[0].payload).toBe('second');
    expect(newEvents[0].ts).toBeGreaterThan(pastTs);
  });

  it('returns events in FIFO order (ascending ts)', () => {
    for (let i = 0; i < 10; i++) publish('ordered', 'a1', `msg-${i}`);
    const events = subscribe('ordered');
    for (let i = 1; i < events.length; i++) {
      expect(events[i].ts).toBeGreaterThanOrEqual(events[i - 1].ts);
    }
  });

  it('handles high volume -- 1000 events all retrieved', () => {
    for (let i = 0; i < 1000; i++) publish('bulk', 'a1', `payload-${i}`);
    const events = subscribe('bulk');
    expect(events).toHaveLength(1000);
    expect(events[0].payload).toBe('payload-0');
    expect(events[999].payload).toBe('payload-999');
  });

  it('returns empty array for unknown channel', () => {
    expect(subscribe('nonexistent')).toEqual([]);
  });
});

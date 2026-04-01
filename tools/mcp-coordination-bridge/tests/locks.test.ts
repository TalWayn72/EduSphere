import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, closeTestDb } from './helpers.js';

let db: Database.Database;

vi.mock('../src/db.js', () => ({
  getDb: () => db,
  closeDb: () => {},
}));

const { acquireLock, releaseLock, checkLock } = await import('../src/locks.js');

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb();
});

describe('acquireLock', () => {
  it('succeeds for first caller on a path', () => {
    const result = acquireLock('src/index.ts', 'agent-1');
    expect(result.locked).toBe(true);
    expect(result.owner).toBe('agent-1');
  });

  it('fails when path already locked by another agent', () => {
    acquireLock('src/index.ts', 'agent-1');
    const result = acquireLock('src/index.ts', 'agent-2');
    expect(result.locked).toBe(false);
    expect(result.owner).toBe('agent-1');
  });
});

describe('releaseLock', () => {
  it('succeeds when owner releases their lock', () => {
    acquireLock('src/index.ts', 'agent-1');
    expect(releaseLock('src/index.ts', 'agent-1').released).toBe(true);
  });

  it('fails when non-owner tries to release', () => {
    acquireLock('src/index.ts', 'agent-1');
    expect(releaseLock('src/index.ts', 'agent-2').released).toBe(false);
  });

  it('allows re-acquisition after release', () => {
    acquireLock('src/index.ts', 'agent-1');
    releaseLock('src/index.ts', 'agent-1');
    const result = acquireLock('src/index.ts', 'agent-2');
    expect(result.locked).toBe(true);
    expect(result.owner).toBe('agent-2');
  });
});

describe('checkLock', () => {
  it('reports unlocked for free path', () => {
    const info = checkLock('free/path.ts');
    expect(info.locked).toBe(false);
    expect(info.owner).toBeUndefined();
  });

  it('reports locked with correct owner and expiry', () => {
    acquireLock('locked/file.ts', 'agent-3');
    const info = checkLock('locked/file.ts');
    expect(info.locked).toBe(true);
    expect(info.owner).toBe('agent-3');
    expect(info.expires_at).toBeDefined();
  });
});

describe('expired lock cleanup', () => {
  it('cleans up expired locks on acquire', () => {
    const pastExpiry = Date.now() / 1000 - 10;
    db.prepare(
      'INSERT INTO locks (path, agent_id, acquired_at, expires_at) VALUES (?, ?, ?, ?)'
    ).run('expired.ts', 'old-agent', pastExpiry - 100, pastExpiry);

    const result = acquireLock('expired.ts', 'new-agent');
    expect(result.locked).toBe(true);
    expect(result.owner).toBe('new-agent');
  });

  it('cleans up expired locks on checkLock', () => {
    const pastExpiry = Date.now() / 1000 - 10;
    db.prepare(
      'INSERT INTO locks (path, agent_id, acquired_at, expires_at) VALUES (?, ?, ?, ?)'
    ).run('expired2.ts', 'old-agent', pastExpiry - 100, pastExpiry);

    expect(checkLock('expired2.ts').locked).toBe(false);
  });
});

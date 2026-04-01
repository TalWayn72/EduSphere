import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  createTestDb,
  closeTestDb,
} from '../../mcp-coordination-bridge/tests/helpers.js';

let db: Database.Database;

vi.mock('../../mcp-coordination-bridge/src/db.js', () => ({
  getDb: () => db,
  closeDb: () => {},
}));

const { publish, subscribe } =
  await import('../../mcp-coordination-bridge/src/pubsub.js');
const { acquireLock, releaseLock, checkLock } =
  await import('../../mcp-coordination-bridge/src/locks.js');
const { registerAgent, updateStatus } =
  await import('../../mcp-coordination-bridge/src/status.js');
const { requestHelp, respondHelp, getPendingHelp } =
  await import('../../mcp-coordination-bridge/src/help.js');

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb();
});

describe('full coordination flow', () => {
  it('Agent A registers, locks, publishes; Agent B waits, then proceeds', () => {
    // Agent A registers and locks a file
    registerAgent('agent-a', 'Frontend', 'Component Specialist');
    updateStatus('agent-a', 'running');
    expect(acquireLock('src/App.tsx', 'agent-a').locked).toBe(true);

    // Agent A publishes progress
    publish(
      'fe:progress',
      'agent-a',
      JSON.stringify({ file: 'src/App.tsx', action: 'editing' })
    );

    // Agent B checks lock — sees it's taken
    registerAgent('agent-b', 'Frontend', 'State Specialist');
    updateStatus('agent-b', 'running');
    expect(checkLock('src/App.tsx').locked).toBe(true);
    expect(checkLock('src/App.tsx').owner).toBe('agent-a');

    // Agent B works on different file
    expect(acquireLock('src/store.ts', 'agent-b').locked).toBe(true);

    // Agent A finishes, unlocks, publishes completion
    releaseLock('src/App.tsx', 'agent-a');
    publish(
      'fe:progress',
      'agent-a',
      JSON.stringify({ file: 'src/App.tsx', action: 'complete' })
    );
    updateStatus('agent-a', 'complete');

    // Agent B finds completion event and acquires released file
    const events = subscribe('fe:progress');
    expect(events).toHaveLength(2);
    expect(JSON.parse(events[1].payload).action).toBe('complete');

    const bNewLock = acquireLock('src/App.tsx', 'agent-b');
    expect(bNewLock.locked).toBe(true);
    expect(bNewLock.owner).toBe('agent-b');
  });

  it('help request from FE to BE division — full lifecycle', () => {
    registerAgent('fe-lead', 'Frontend', 'Lead');
    registerAgent('be-lead', 'Backend', 'Lead');

    // FE requests help
    const helpReq = requestHelp(
      'fe-lead',
      'Backend',
      'Need API schema for user profile'
    );
    expect(helpReq.status).toBe('pending');

    // BE sees pending request
    const pending = getPendingHelp('Backend');
    expect(pending).toHaveLength(1);
    expect(pending[0].query).toContain('user profile');

    // BE responds
    const responded = respondHelp(
      helpReq.id,
      'Schema: { id, name, email, avatar }'
    );
    expect(responded!.status).toBe('responded');
    expect(responded!.response).toContain('Schema:');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, closeTestDb } from './helpers.js';

let db: Database.Database;

vi.mock('../src/db.js', () => ({
  getDb: () => db,
  closeDb: () => {},
}));

const { registerAgent, updateStatus, getDivisionStatus } =
  await import('../src/status.js');
const { logViolation, getViolations } = await import('../src/rules.js');
const { requestHelp, respondHelp, getPendingHelp } =
  await import('../src/help.js');

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb();
});

// --- Agent Status ---
describe('registerAgent', () => {
  it('registers and returns agent record', () => {
    const agent = registerAgent('fe-1', 'Frontend', 'Component Specialist');
    expect(agent.id).toBe('fe-1');
    expect(agent.division).toBe('Frontend');
    expect(agent.status).toBe('registered');
  });

  it('multiple agents register in same division', () => {
    registerAgent('fe-1', 'Frontend', 'Component');
    registerAgent('fe-2', 'Frontend', 'State');
    expect(getDivisionStatus('Frontend')).toHaveLength(2);
  });
});

describe('updateStatus', () => {
  it('updates agent status correctly', () => {
    registerAgent('be-1', 'Backend', 'API Specialist');
    const updated = updateStatus('be-1', 'running');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('running');
  });

  it('returns null for non-existent agent', () => {
    expect(updateStatus('ghost', 'running')).toBeNull();
  });

  it('throws on invalid status', () => {
    registerAgent('be-1', 'Backend', 'API');
    expect(() => updateStatus('be-1', 'invalid_status')).toThrow(
      'Invalid status'
    );
  });
});

describe('getDivisionStatus', () => {
  it('returns only agents from requested division', () => {
    registerAgent('fe-1', 'Frontend', 'Component');
    registerAgent('be-1', 'Backend', 'API');
    const feAgents = getDivisionStatus('Frontend');
    expect(feAgents).toHaveLength(1);
    expect(feAgents[0].id).toBe('fe-1');
  });

  it('returns empty for unknown division', () => {
    expect(getDivisionStatus('Unknown')).toEqual([]);
  });
});

// --- Violations ---
describe('logViolation', () => {
  it('logs and returns violation record', () => {
    const v = logViolation('agent-x', 'SI-1', 'Used wrong variable');
    expect(v.id).toBeGreaterThan(0);
    expect(v.agent_id).toBe('agent-x');
    expect(v.rule).toBe('SI-1');
    expect(v.details).toBe('Used wrong variable');
  });
});

describe('getViolations', () => {
  it('retrieves violations filtered by agent', () => {
    logViolation('a1', 'SI-1', 'detail1');
    logViolation('a2', 'SI-2', 'detail2');
    const v = getViolations('a1');
    expect(v).toHaveLength(1);
    expect(v[0].agent_id).toBe('a1');
  });

  it('returns all violations when no filter', () => {
    logViolation('a1', 'SI-1');
    logViolation('a2', 'SI-2');
    expect(getViolations()).toHaveLength(2);
  });
});

// --- Help Requests ---
describe('help request lifecycle', () => {
  it('request -> pending -> responded', () => {
    const req = requestHelp('fe-1', 'Backend', 'How to call the API?');
    expect(req.status).toBe('pending');
    expect(req.response).toBeNull();

    const responded = respondHelp(req.id, 'Use GraphQL mutation X');
    expect(responded).not.toBeNull();
    expect(responded!.status).toBe('responded');
    expect(responded!.response).toBe('Use GraphQL mutation X');
  });

  it('respondHelp returns null for unknown id', () => {
    expect(respondHelp(999, 'response')).toBeNull();
  });
});

describe('getPendingHelp', () => {
  it('filters by division', () => {
    requestHelp('fe-1', 'Backend', 'Q1');
    requestHelp('fe-2', 'Database', 'Q2');
    const beHelp = getPendingHelp('Backend');
    expect(beHelp).toHaveLength(1);
    expect(beHelp[0].to_division).toBe('Backend');
  });

  it('returns all pending when no division filter', () => {
    requestHelp('a1', 'Backend', 'Q1');
    requestHelp('a2', 'Database', 'Q2');
    expect(getPendingHelp()).toHaveLength(2);
  });
});

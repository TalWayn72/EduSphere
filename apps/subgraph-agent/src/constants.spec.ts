import { describe, it, expect } from 'vitest';
import {
  LANGGRAPH_MAX_MEMORY_SESSIONS,
  LANGGRAPH_CLEANUP_INTERVAL_MS,
  SESSION_CLEANUP_INTERVAL_MS,
  STALE_SESSION_AGE_MS,
} from './constants.js';

describe('agent subgraph constants', () => {
  it('LANGGRAPH_MAX_MEMORY_SESSIONS is 1000', () => {
    expect(LANGGRAPH_MAX_MEMORY_SESSIONS).toBe(1000);
  });

  it('LANGGRAPH_CLEANUP_INTERVAL_MS is 5 minutes in ms', () => {
    expect(LANGGRAPH_CLEANUP_INTERVAL_MS).toBe(5 * 60 * 1000);
  });

  it('SESSION_CLEANUP_INTERVAL_MS is 30 minutes in ms', () => {
    expect(SESSION_CLEANUP_INTERVAL_MS).toBe(30 * 60 * 1000);
  });

  it('STALE_SESSION_AGE_MS is 24 hours in ms', () => {
    expect(STALE_SESSION_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('SESSION_CLEANUP_INTERVAL_MS is less than STALE_SESSION_AGE_MS', () => {
    expect(SESSION_CLEANUP_INTERVAL_MS).toBeLessThan(STALE_SESSION_AGE_MS);
  });

  it('all constants are positive integers', () => {
    for (const val of [
      LANGGRAPH_MAX_MEMORY_SESSIONS,
      LANGGRAPH_CLEANUP_INTERVAL_MS,
      SESSION_CLEANUP_INTERVAL_MS,
      STALE_SESSION_AGE_MS,
    ]) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    }
  });
});

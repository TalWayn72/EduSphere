/**
 * Shared test helpers for AgentSandboxService specs.
 */
import { vi } from 'vitest';
import type { EventEmitter } from 'events';

export interface MockChild extends EventEmitter {
  send: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  killed: boolean;
  pid: number;
}

const state = { lastChild: null as MockChild | null };

/** Access the most recently forked mock child */
export const lastChild = state;

export const mockFork = vi.fn();

export function createMockChild(): MockChild {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('events');
  const child = new EventEmitter() as MockChild;
  child.send = vi.fn();
  child.kill = vi.fn().mockImplementation(() => {
    child.killed = true;
  });
  child.killed = false;
  child.pid = Math.floor(Math.random() * 10000) + 1000;
  state.lastChild = child;
  return child;
}

export function resetLastChild(): void {
  state.lastChild = null;
}

export const BASE_CONFIG = {
  agent: { template: 'SUMMARIZE' },
  input: { message: 'Hello' },
  tenantId: 'tenant-1',
};

/** Emit a success result from a mock child */
export function emitSuccess(
  child: MockChild,
  data: Record<string, unknown> = {}
): void {
  child.emit('message', {
    type: 'result',
    response: { success: true, data },
  });
}

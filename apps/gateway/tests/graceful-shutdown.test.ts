/**
 * Unit tests for WebSocket graceful shutdown handler.
 * Verifies: signal registration, connection draining, NATS cleanup, timeout behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { Server } from 'http';
import type { Logger } from 'pino';
import {
  performShutdown,
  waitForConnectionDrain,
  registerShutdownHandlers,
  DRAIN_TIMEOUT_MS,
  type ShutdownDeps,
} from '../src/graceful-shutdown.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockServer(connectionCount = 0): Server {
  let closeCb: ((err?: Error) => void) | null = null;
  const mock = {
    close: vi.fn((cb: (err?: Error) => void) => {
      closeCb = cb;
      // Simulate async close completing immediately
      process.nextTick(() => closeCb?.());
    }),
    getConnections: vi.fn(
      (cb: (err: Error | null, count: number) => void) => {
        cb(null, connectionCount);
      }
    ),
  };
  return mock as unknown as Server;
}

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function createDeps(overrides: Partial<ShutdownDeps> = {}): ShutdownDeps {
  return {
    server: createMockServer(),
    stopRateLimitCleanup: vi.fn(),
    shutdownNatsPubSub: vi.fn().mockResolvedValue(undefined),
    logger: createMockLogger(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DRAIN_TIMEOUT_MS', () => {
  it('defaults to 30000ms', () => {
    expect(DRAIN_TIMEOUT_MS).toBe(30000);
  });
});

describe('registerShutdownHandlers', () => {
  let processSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    processSpy = vi.spyOn(process, 'on');
  });

  afterEach(() => {
    processSpy.mockRestore();
  });

  it('registers SIGTERM and SIGINT listeners', () => {
    const deps = createDeps();
    registerShutdownHandlers(deps);

    const registeredEvents = processSpy.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain('SIGTERM');
    expect(registeredEvents).toContain('SIGINT');
  });

  it('logs that handlers were registered', () => {
    const deps = createDeps();
    registerShutdownHandlers(deps);

    expect(deps.logger.info).toHaveBeenCalledWith(
      '[shutdown] graceful shutdown handlers registered'
    );
  });
});

describe('performShutdown', () => {
  it('closes the HTTP server', async () => {
    const deps = createDeps();
    await performShutdown('SIGTERM', deps);

    expect(deps.server.close).toHaveBeenCalledOnce();
  });

  it('calls stopRateLimitCleanup', async () => {
    const deps = createDeps();
    await performShutdown('SIGTERM', deps);

    expect(deps.stopRateLimitCleanup).toHaveBeenCalledOnce();
  });

  it('calls shutdownNatsPubSub', async () => {
    const deps = createDeps();
    await performShutdown('SIGTERM', deps);

    expect(deps.shutdownNatsPubSub).toHaveBeenCalledOnce();
  });

  it('logs the signal that triggered shutdown', async () => {
    const deps = createDeps();
    await performShutdown('SIGINT', deps);

    expect(deps.logger.info).toHaveBeenCalledWith(
      { signal: 'SIGINT' },
      '[shutdown] received signal — starting graceful shutdown'
    );
  });

  it('logs completion when all steps succeed', async () => {
    const deps = createDeps();
    await performShutdown('SIGTERM', deps);

    expect(deps.logger.info).toHaveBeenCalledWith(
      '[shutdown] graceful shutdown complete'
    );
  });

  it('executes cleanup in order: server close → drain → rate limit → NATS', async () => {
    const order: string[] = [];
    const server = createMockServer();
    (server.close as ReturnType<typeof vi.fn>).mockImplementation(
      (cb: () => void) => {
        order.push('server.close');
        process.nextTick(cb);
      }
    );
    const deps = createDeps({
      server,
      stopRateLimitCleanup: vi.fn(() => order.push('stopRateLimit')),
      shutdownNatsPubSub: vi.fn(async () => order.push('nats')),
    });

    await performShutdown('SIGTERM', deps);

    expect(order).toEqual(['server.close', 'stopRateLimit', 'nats']);
  });
});

describe('waitForConnectionDrain', () => {
  it('returns true immediately when no active connections', async () => {
    const server = createMockServer(0);
    const logger = createMockLogger();

    const result = await waitForConnectionDrain(server, 5000, logger);

    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      '[shutdown] all connections drained'
    );
  });

  it('polls until connections reach zero', async () => {
    let callCount = 0;
    const server = {
      getConnections: vi.fn(
        (cb: (err: Error | null, count: number) => void) => {
          callCount++;
          // First 2 calls: 3 connections; third call: 0
          cb(null, callCount < 3 ? 3 : 0);
        }
      ),
    } as unknown as Server;
    const logger = createMockLogger();

    const result = await waitForConnectionDrain(server, 10000, logger);

    expect(result).toBe(true);
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  it('returns false when timeout expires with active connections', async () => {
    const server = createMockServer(5); // always 5 connections
    const logger = createMockLogger();

    const result = await waitForConnectionDrain(server, 800, logger);

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ remaining: 5, timeoutMs: 800 }),
      '[shutdown] drain timeout expired — forcing close'
    );
  });
});

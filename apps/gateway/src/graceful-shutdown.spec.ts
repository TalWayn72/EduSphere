import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  waitForConnectionDrain,
  performShutdown,
  registerShutdownHandlers,
  type ShutdownDeps,
} from './graceful-shutdown';
import type { Server } from 'http';
import type { Logger } from 'pino';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockServer(connectionSequence: number[]): Server {
  let callIdx = 0;
  return {
    getConnections: vi.fn((cb: (err: Error | null, count: number) => void) => {
      const count = connectionSequence[callIdx] ?? 0;
      callIdx++;
      cb(null, count);
    }),
    close: vi.fn((cb?: (err?: Error) => void) => {
      cb?.();
    }),
  } as unknown as Server;
}

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function createMockDeps(
  overrides: Partial<ShutdownDeps> = {}
): ShutdownDeps {
  return {
    server: createMockServer([0]),
    stopRateLimitCleanup: vi.fn(),
    shutdownNatsPubSub: vi.fn().mockResolvedValue(undefined),
    logger: createMockLogger(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// waitForConnectionDrain
// ---------------------------------------------------------------------------

describe('waitForConnectionDrain', () => {
  it('returns true immediately when no active connections', async () => {
    const server = createMockServer([0]);
    const logger = createMockLogger();

    const result = await waitForConnectionDrain(server, 5000, logger);
    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('all connections drained')
    );
  });

  it('polls until connections reach zero', async () => {
    const server = createMockServer([3, 2, 1, 0]);
    const logger = createMockLogger();

    const result = await waitForConnectionDrain(server, 10000, logger);
    expect(result).toBe(true);
    // Should have logged waiting messages
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ activeConnections: 3 }),
      expect.any(String)
    );
  });

  it('returns false when timeout expires with remaining connections', async () => {
    // Always returns 5 connections — will never drain
    const server = {
      getConnections: vi.fn(
        (cb: (err: Error | null, count: number) => void) => cb(null, 5)
      ),
    } as unknown as Server;
    const logger = createMockLogger();

    const result = await waitForConnectionDrain(server, 100, logger);
    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ remaining: 5 }),
      expect.stringContaining('drain timeout expired')
    );
  });

  it('rejects when getConnections returns an error', async () => {
    const server = {
      getConnections: vi.fn(
        (cb: (err: Error | null, count: number) => void) =>
          cb(new Error('socket error'), 0)
      ),
    } as unknown as Server;
    const logger = createMockLogger();

    await expect(
      waitForConnectionDrain(server, 5000, logger)
    ).rejects.toThrow('socket error');
  });
});

// ---------------------------------------------------------------------------
// performShutdown
// ---------------------------------------------------------------------------

describe('performShutdown', () => {
  it('executes shutdown steps in order', async () => {
    const deps = createMockDeps();
    await performShutdown('SIGTERM', deps);

    // server.close was called
    expect(deps.server.close).toHaveBeenCalled();
    // rate limit cleanup stopped
    expect(deps.stopRateLimitCleanup).toHaveBeenCalled();
    // NATS drained
    expect(deps.shutdownNatsPubSub).toHaveBeenCalled();
    // Logged signal
    expect(deps.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ signal: 'SIGTERM' }),
      expect.stringContaining('starting graceful shutdown')
    );
  });

  it('rejects when server.close returns an error', async () => {
    const server = {
      getConnections: vi.fn((cb: (err: Error | null, count: number) => void) =>
        cb(null, 0)
      ),
      close: vi.fn((cb?: (err?: Error) => void) => {
        cb?.(new Error('close failed'));
      }),
    } as unknown as Server;

    const deps = createMockDeps({ server });
    await expect(performShutdown('SIGTERM', deps)).rejects.toThrow(
      'close failed'
    );
  });

  it('calls shutdownNatsPubSub after stopping rate limit', async () => {
    const callOrder: string[] = [];
    const deps = createMockDeps({
      stopRateLimitCleanup: vi.fn(() => callOrder.push('rateLimit')),
      shutdownNatsPubSub: vi.fn(async () => {
        callOrder.push('nats');
      }),
    });

    await performShutdown('SIGINT', deps);
    expect(callOrder).toEqual(['rateLimit', 'nats']);
  });
});

// ---------------------------------------------------------------------------
// registerShutdownHandlers
// ---------------------------------------------------------------------------

describe('registerShutdownHandlers', () => {
  beforeEach(() => {
    // Remove existing listeners to avoid interference
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('registers handlers for SIGTERM and SIGINT', () => {
    const deps = createMockDeps();
    const onSpy = vi.spyOn(process, 'on');

    registerShutdownHandlers(deps);

    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(deps.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('handlers registered')
    );

    onSpy.mockRestore();
    // Clean up registered handlers
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });
});

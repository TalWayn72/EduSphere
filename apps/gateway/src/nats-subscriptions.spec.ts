import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Logger } from 'pino';

// Reset the singleton between tests by re-importing the module
let createNatsPubSub: typeof import('./nats-subscriptions')['createNatsPubSub'];
let shutdownNatsPubSub: typeof import('./nats-subscriptions')['shutdownNatsPubSub'];

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

describe('nats-subscriptions', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    delete process.env['NATS_URL'];
    // Re-import to reset the module-level singleton
    vi.resetModules();
    const mod = await import('./nats-subscriptions');
    createNatsPubSub = mod.createNatsPubSub;
    shutdownNatsPubSub = mod.shutdownNatsPubSub;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    // Ensure singleton is cleaned up
    try {
      await shutdownNatsPubSub();
    } catch {
      // ignore
    }
  });

  // ─── InProcessPubSub (no NATS_URL) ─────────────────────────────────────────

  describe('InProcessPubSub fallback', () => {
    it('returns an InProcessPubSub when NATS_URL is not set', async () => {
      const logger = createMockLogger();
      const pubSub = await createNatsPubSub(logger);

      expect(pubSub).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('NATS_URL not set')
      );
    });

    it('returns the same singleton on subsequent calls', async () => {
      const logger = createMockLogger();
      const ps1 = await createNatsPubSub(logger);
      const ps2 = await createNatsPubSub(logger);
      expect(ps1).toBe(ps2);
    });

    it('publishes and receives messages via EventEmitter', async () => {
      const logger = createMockLogger();
      const pubSub = await createNatsPubSub(logger);

      const received: unknown[] = [];
      await pubSub.subscribe('test.topic', (payload) => {
        received.push(payload);
      });

      await pubSub.publish('test.topic', { message: 'hello' });
      expect(received).toEqual([{ message: 'hello' }]);
    });

    it('unsubscribe stops receiving messages', async () => {
      const logger = createMockLogger();
      const pubSub = await createNatsPubSub(logger);

      const received: unknown[] = [];
      const unsub = await pubSub.subscribe('test.topic', (payload) => {
        received.push(payload);
      });

      await pubSub.publish('test.topic', { m: 1 });
      unsub();
      await pubSub.publish('test.topic', { m: 2 });

      expect(received).toEqual([{ m: 1 }]);
    });

    it('close removes all listeners', async () => {
      const logger = createMockLogger();
      const pubSub = await createNatsPubSub(logger);

      const received: unknown[] = [];
      await pubSub.subscribe('a', (p) => received.push(p));

      await pubSub.close();

      // After close, publishing should not trigger callbacks
      // (EventEmitter listeners removed)
      await pubSub.publish('a', { m: 1 });
      expect(received).toEqual([]);
    });
  });

  // ─── shutdownNatsPubSub ─────────────────────────────────────────────────────

  describe('shutdownNatsPubSub', () => {
    it('does nothing when no singleton exists', async () => {
      // Should not throw
      await expect(shutdownNatsPubSub()).resolves.toBeUndefined();
    });

    it('closes the active pubsub engine', async () => {
      const logger = createMockLogger();
      await createNatsPubSub(logger);

      await shutdownNatsPubSub();

      // After shutdown, a new call should create a fresh instance
      vi.resetModules();
      const mod = await import('./nats-subscriptions');
      const logger2 = createMockLogger();
      const newPubSub = await mod.createNatsPubSub(logger2);
      expect(newPubSub).toBeDefined();
    });
  });

  // ─── NATS connection failure fallback ───────────────────────────────────────

  describe('NATS connection failure', () => {
    it('falls back to InProcessPubSub when NATS connect fails', async () => {
      process.env['NATS_URL'] = 'nats://unreachable:4222';
      vi.resetModules();

      // Mock nats module to simulate connection failure
      vi.doMock('nats', () => ({
        connect: vi.fn().mockRejectedValue(new Error('connection refused')),
      }));

      const mod = await import('./nats-subscriptions');
      const logger = createMockLogger();
      const pubSub = await mod.createNatsPubSub(logger);

      expect(pubSub).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ natsUrl: 'nats://unreachable:4222' }),
        expect.stringContaining('NATS connection failed')
      );

      // Should still work as in-process
      const received: unknown[] = [];
      await pubSub.subscribe('t', (p) => received.push(p));
      await pubSub.publish('t', 'hello');
      expect(received).toEqual(['hello']);
    });
  });
});

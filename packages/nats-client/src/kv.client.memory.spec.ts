import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatsKVClient } from './kv.client';

// ── NATS mock ─────────────────────────────────────────────────────────────────

/** Minimal KV handle returned by mocked js.views.kv(). */
function makeKvHandle() {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMockNc(drainSpy?: ReturnType<typeof vi.fn>) {
  const drain = drainSpy ?? vi.fn().mockResolvedValue(undefined);

  const jsm = {
    streams: {
      add: vi.fn().mockResolvedValue(undefined),
    },
  };

  const js = {
    views: {
      kv: vi.fn().mockResolvedValue(makeKvHandle()),
    },
  };

  return {
    drain,
    jetstream: vi.fn().mockReturnValue(js),
    jetstreamManager: vi.fn().mockResolvedValue(jsm),
    _js: js,
  };
}

// Hoist mock so it is available before module-level import resolution.
vi.mock('nats', () => {
  const mockNc = makeMockNc();
  return {
    connect: vi.fn().mockResolvedValue(mockNc),
    StringCodec: vi.fn().mockReturnValue({
      encode: (s: string) => Buffer.from(s),
      decode: (b: Uint8Array) => Buffer.from(b).toString(),
    }),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return a fresh NatsKVClient backed by a fresh mock NATS connection. */
async function makeClient() {
  const { connect } = await import('nats');
  const drainSpy = vi.fn().mockResolvedValue(undefined);
  const nc = makeMockNc(drainSpy);
  vi.mocked(connect).mockResolvedValue(nc as never);

  const client = new NatsKVClient({ url: 'nats://mock:4222' });
  return { client, nc, drainSpy };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NatsKVClient memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── LRU eviction ────────────────────────────────────────────────────────────

  describe('LRU eviction', () => {
    it('evicts the oldest store when the cache exceeds 1000 entries', async () => {
      const { client } = await makeClient();

      // Access 1001 distinct buckets. Each call hits the "not cached" branch
      // and adds a new entry to the internal stores Map.
      for (let i = 0; i < 1001; i++) {
        await client.getStore(`bucket-${i}`);
      }

      // After 1001 inserts with a cap of 1000, the Map must hold exactly 1000.
      // We can only observe this indirectly: a second call to the FIRST bucket
      // must NOT hit the in-memory cache (the cached KV ref was evicted).
      // The easiest observable proxy is that the client re-calls connection()
      // for bucket-0 on the next access, but the simplest is to expose the
      // Map size via a type cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stores: Map<string, unknown> = (client as any).stores;
      expect(stores.size).toBe(1000);
    });

    it('retains the most recently added store when evicting', async () => {
      const { client } = await makeClient();

      // Fill the cache to exactly the limit.
      for (let i = 0; i < 1001; i++) {
        await client.getStore(`bucket-${i}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stores: Map<string, unknown> = (client as any).stores;

      // The FIRST bucket added (bucket-0) is the oldest → must be evicted.
      expect(stores.has('bucket-0')).toBe(false);

      // The LAST bucket added (bucket-1000) must still be present.
      expect(stores.has('bucket-1000')).toBe(true);
    });
  });

  // ── close() ─────────────────────────────────────────────────────────────────

  describe('close()', () => {
    it('drains the NATS connection on close()', async () => {
      const { client, drainSpy } = await makeClient();

      // Trigger lazy connection establishment.
      await client.getStore('test-bucket');

      await client.close();

      expect(drainSpy).toHaveBeenCalledOnce();
    });

    it('sets the internal connection reference to null after close()', async () => {
      const { client } = await makeClient();

      await client.getStore('test-bucket');
      await client.close();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).nc).toBeNull();
    });

    it('clears the stores Map on close()', async () => {
      const { client } = await makeClient();

      // Add a few stores to the cache.
      await client.getStore('bucket-a');
      await client.getStore('bucket-b');
      await client.getStore('bucket-c');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stores: Map<string, unknown> = (client as any).stores;
      expect(stores.size).toBe(3);

      await client.close();

      expect(stores.size).toBe(0);
    });

    it('does not throw when close() is called without an active connection', async () => {
      const { client } = await makeClient();

      // close() before any getStore() — nc is still null.
      await expect(client.close()).resolves.not.toThrow();
    });
  });
});

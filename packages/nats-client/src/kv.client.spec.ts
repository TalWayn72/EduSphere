import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatsKVClient } from './kv.client.js';

// ── NATS mock infrastructure ──────────────────────────────────────────────────

const mockStorePut = vi.fn();
const mockStoreGet = vi.fn();
const mockStoreDelete = vi.fn();

const mockKvStore = {
  put: mockStorePut,
  get: mockStoreGet,
  delete: mockStoreDelete,
};

const mockStreamsAdd = vi.fn();
const mockJsm = { streams: { add: mockStreamsAdd } };

const mockKvView = vi.fn();
const mockJs = { views: { kv: mockKvView } };

const mockDrain = vi.fn().mockResolvedValue(undefined);
const mockJetstreamManager = vi.fn().mockResolvedValue(mockJsm);
const mockJetstream = vi.fn().mockReturnValue(mockJs);

const mockNc = {
  jetstream: mockJetstream,
  jetstreamManager: mockJetstreamManager,
  drain: mockDrain,
};

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNc),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => new TextEncoder().encode(s),
    decode: (b: Uint8Array) => new TextDecoder().decode(b),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEntry(value: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return { value: encoded };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NatsKVClient', () => {
  let client: NatsKVClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: bucket already exists
    mockKvView.mockResolvedValue(mockKvStore);
    client = new NatsKVClient({ url: 'nats://localhost:4222' });
  });

  // ── getStore ───────────────────────────────────────────────────────────────

  describe('getStore()', () => {
    it('returns the KV store when the bucket already exists', async () => {
      mockKvView.mockResolvedValue(mockKvStore);
      const store = await client.getStore('test-bucket');
      expect(store).toBe(mockKvStore);
    });

    it('creates the stream and retries when the bucket does not exist', async () => {
      // First call throws (bucket absent), second succeeds
      mockKvView
        .mockRejectedValueOnce(new Error('stream not found'))
        .mockResolvedValueOnce(mockKvStore);

      const store = await client.getStore('new-bucket');

      expect(mockStreamsAdd).toHaveBeenCalledOnce();
      expect(mockStreamsAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'KV_new-bucket',
          subjects: ['$KV.new-bucket.>'],
        })
      );
      expect(store).toBe(mockKvStore);
    });

    it('caches the store so jetstream().views.kv is only called once per bucket', async () => {
      await client.getStore('cached-bucket');
      await client.getStore('cached-bucket');
      // Should only call mockKvView once even though getStore was called twice
      expect(mockKvView).toHaveBeenCalledTimes(1);
    });
  });

  // ── set ────────────────────────────────────────────────────────────────────

  describe('set()', () => {
    it('serialises the value as JSON and calls store.put', async () => {
      mockStorePut.mockResolvedValue(undefined);
      await client.set('agent-memory', 'session-abc', { messages: ['hello'] });
      expect(mockStorePut).toHaveBeenCalledOnce();
      const [key, encodedValue] = mockStorePut.mock.calls[0] as [string, Uint8Array];
      expect(key).toBe('session-abc');
      expect(JSON.parse(new TextDecoder().decode(encodedValue))).toEqual({ messages: ['hello'] });
    });

    it('stores primitive values (string) without throwing', async () => {
      mockStorePut.mockResolvedValue(undefined);
      await expect(client.set('bucket', 'key', 'simple-string')).resolves.toBeUndefined();
    });

    it('stores null as a valid JSON value', async () => {
      mockStorePut.mockResolvedValue(undefined);
      await client.set('bucket', 'key', null);
      const [, encodedValue] = mockStorePut.mock.calls[0] as [string, Uint8Array];
      expect(JSON.parse(new TextDecoder().decode(encodedValue))).toBeNull();
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('returns the deserialised value when the key exists', async () => {
      mockStoreGet.mockResolvedValue(makeEntry({ role: 'user', content: 'hello' }));
      const result = await client.get<{ role: string; content: string }>('agent-memory', 'session-1');
      expect(result).toEqual({ role: 'user', content: 'hello' });
    });

    it('returns null when the key does not exist', async () => {
      mockStoreGet.mockResolvedValue(null);
      const result = await client.get('agent-memory', 'missing-key');
      expect(result).toBeNull();
    });

    it('returns null when the entry is undefined', async () => {
      mockStoreGet.mockResolvedValue(undefined);
      const result = await client.get('agent-memory', 'undefined-key');
      expect(result).toBeNull();
    });

    it('correctly deserialises nested objects', async () => {
      const payload = { sessionId: 'abc', messages: [{ role: 'user', content: 'hi' }] };
      mockStoreGet.mockResolvedValue(makeEntry(payload));
      const result = await client.get<typeof payload>('bucket', 'key');
      expect(result).toEqual(payload);
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls store.delete with the correct key', async () => {
      mockStoreDelete.mockResolvedValue(undefined);
      await client.delete('agent-memory', 'session-xyz');
      expect(mockStoreDelete).toHaveBeenCalledWith('session-xyz');
    });

    it('resolves without throwing when the key exists', async () => {
      mockStoreDelete.mockResolvedValue(undefined);
      await expect(client.delete('bucket', 'key')).resolves.toBeUndefined();
    });
  });

  // ── close ──────────────────────────────────────────────────────────────────

  describe('close()', () => {
    it('drains the connection and clears the store cache', async () => {
      // Establish a connection by performing an operation first
      await client.getStore('some-bucket');
      await client.close();
      expect(mockDrain).toHaveBeenCalledOnce();
    });

    it('does not throw when called without a prior connection', async () => {
      await expect(client.close()).resolves.toBeUndefined();
    });
  });
});

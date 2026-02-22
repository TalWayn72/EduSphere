import { connect, StringCodec, type KV, type NatsConnection } from 'nats';

// ── Constants ─────────────────────────────────────────────────────────────────

/** 24-hour TTL expressed in nanoseconds (NATS JetStream unit). */
const DEFAULT_TTL_NS = 24 * 60 * 60 * 1_000_000_000;

/** Maximum number of KV store handles to cache before evicting the oldest. */
const MAX_STORE_CACHE_SIZE = 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KVClientOptions {
  /** NATS server URL. Defaults to NATS_URL env var or nats://localhost:4222. */
  url?: string;
  /** Default TTL for all buckets in nanoseconds. Defaults to 24 hours. */
  defaultTtlNs?: number;
}

// ── NatsKVClient ──────────────────────────────────────────────────────────────

/**
 * Thin wrapper around NATS JetStream Key-Value store.
 *
 * Provides typed get/set/delete operations with automatic bucket creation
 * and per-bucket TTL. Connections are lazily established and shared.
 */
export class NatsKVClient {
  private readonly sc = StringCodec();
  private readonly url: string;
  private readonly defaultTtlNs: number;
  private nc: NatsConnection | null = null;
  /** Cache of already-opened KV stores (bucket name → KV handle). */
  private readonly stores = new Map<string, KV>();

  constructor(options?: KVClientOptions) {
    this.url = options?.url ?? process.env['NATS_URL'] ?? 'nats://localhost:4222';
    this.defaultTtlNs = options?.defaultTtlNs ?? DEFAULT_TTL_NS;
  }

  // ── Connection ─────────────────────────────────────────────────────────────

  /** Returns the active NATS connection, establishing it if necessary. */
  private async connection(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect({ servers: this.url });
    }
    return this.nc;
  }

  // ── Bucket resolution ──────────────────────────────────────────────────────

  /**
   * Returns the KV store for `bucketName`, creating the stream if it does not
   * exist yet. Results are cached to avoid redundant lookups.
   *
   * Applies insertion-order LRU eviction when the cache exceeds
   * MAX_STORE_CACHE_SIZE entries.
   */
  async getStore(bucketName: string): Promise<KV> {
    const cached = this.stores.get(bucketName);
    if (cached) return cached;

    const nc = await this.connection();
    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();

    let kv: KV;
    try {
      kv = await js.views.kv(bucketName);
    } catch {
      // Stream does not exist — create it with the configured TTL.
      await jsm.streams.add({
        name: `KV_${bucketName}`,
        subjects: [`$KV.${bucketName}.>`],
        max_age: this.defaultTtlNs,
      });
      kv = await js.views.kv(bucketName);
    }

    this.stores.set(bucketName, kv);

    // Evict oldest entry if over limit (insertion-order LRU).
    if (this.stores.size > MAX_STORE_CACHE_SIZE) {
      const oldestKey = this.stores.keys().next().value;
      if (oldestKey !== undefined) {
        this.stores.delete(oldestKey);
      }
    }

    return kv;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  /**
   * Serialises `value` to JSON and stores it under `key` in `bucket`.
   */
  async set(bucket: string, key: string, value: unknown): Promise<void> {
    const store = await this.getStore(bucket);
    await store.put(key, this.sc.encode(JSON.stringify(value)));
  }

  /**
   * Retrieves and deserialises the value stored at `key` in `bucket`.
   * Returns `null` when the key does not exist or has been deleted.
   */
  async get<T>(bucket: string, key: string): Promise<T | null> {
    const store = await this.getStore(bucket);
    const entry = await store.get(key);
    if (!entry) return null;
    return JSON.parse(this.sc.decode(entry.value)) as T;
  }

  /**
   * Soft-deletes `key` from `bucket` (places a delete marker in the stream).
   */
  async delete(bucket: string, key: string): Promise<void> {
    const store = await this.getStore(bucket);
    await store.delete(key);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Gracefully closes the NATS connection.
   * Should be called during application shutdown.
   */
  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.nc = null;
    }
    this.stores.clear();
  }
}

/**
 * APQ (Automatic Persisted Queries) hash registry.
 * Stores SHA-256 hash → query string mappings.
 *
 * SEC-8: When REDIS_URL is set, uses Redis for cross-pod synchronization.
 * Falls back to bounded in-memory Map (10,000 entries, LRU eviction) when
 * Redis is unavailable — single-instance only.
 */
import pino from 'pino';

const logger = pino({ level: 'info' });

const MAX_REGISTRY_SIZE = 10_000;

// ── In-memory fallback ──────────────────────────────────────────────────────
const memoryRegistry = new Map<string, string>();

// ── Redis backend (lazy-initialized) ────────────────────────────────────────
const REDIS_URL = process.env['REDIS_URL'];
const REDIS_APQ_PREFIX = 'apq:';
const REDIS_APQ_TTL = 86400; // 24 hours

let redisClient: {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  dbSize(): Promise<number>;
  quit(): Promise<unknown>;
} | null = null;
let redisReady = false;

async function getRedisClient(): Promise<typeof redisClient> {
  if (!REDIS_URL) return null;
  if (redisClient && redisReady) return redisClient;

  try {
    // Dynamic import — redis is optional dependency (may not be installed)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const redisMod = await (Function('return import("redis")')() as Promise<
      Record<string, unknown>
    >);
    const createClient = redisMod['createClient'] as (opts: {
      url: string;
    }) => Record<string, unknown>;
    const client = createClient({ url: REDIS_URL });
    await (client['connect'] as () => Promise<void>)();
    redisClient = client as unknown as typeof redisClient;
    redisReady = true;
    logger.info('SEC-8: APQ registry using Redis backend for cross-pod sync');
    return redisClient;
  } catch (err) {
    logger.warn(
      { err },
      'SEC-8: Redis unavailable for APQ — falling back to in-memory registry'
    );
    redisReady = false;
    redisClient = null;
    return null;
  }
}

// Initialize Redis on module load (non-blocking)
void getRedisClient();

/**
 * Register a query string under its SHA-256 hash.
 * Uses Redis if available, otherwise in-memory with LRU eviction.
 */
export async function registerQuery(
  hash: string,
  query: string
): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(`${REDIS_APQ_PREFIX}${hash}`, query, { EX: REDIS_APQ_TTL });
    return;
  }

  // In-memory fallback
  if (memoryRegistry.has(hash)) {
    memoryRegistry.delete(hash);
  } else if (memoryRegistry.size >= MAX_REGISTRY_SIZE) {
    const oldest = memoryRegistry.keys().next().value;
    if (oldest !== undefined) {
      memoryRegistry.delete(oldest);
    }
  }
  memoryRegistry.set(hash, query);
}

/**
 * Look up a stored query by its SHA-256 hash.
 * Returns the query string, or undefined if not registered.
 */
export async function lookupQuery(hash: string): Promise<string | undefined> {
  const redis = await getRedisClient();
  if (redis) {
    const result = await redis.get(`${REDIS_APQ_PREFIX}${hash}`);
    return result ?? undefined;
  }
  return memoryRegistry.get(hash);
}

/**
 * Check whether a hash is already registered.
 */
export async function isRegistered(hash: string): Promise<boolean> {
  const query = await lookupQuery(hash);
  return query !== undefined;
}

/**
 * Return the current number of entries in the registry.
 * For Redis, returns approximate count (all keys, not just APQ).
 */
export async function getRegistrySize(): Promise<number> {
  const redis = await getRedisClient();
  if (redis) {
    return await redis.dbSize();
  }
  return memoryRegistry.size;
}

/**
 * Whether the registry is backed by Redis (cross-pod safe).
 */
export function isRedisBackend(): boolean {
  return redisReady;
}

/**
 * Clear the registry (test teardown helper).
 */
export function _clearRegistry(): void {
  memoryRegistry.clear();
}

/**
 * Synchronous registration for backward compatibility with existing middleware.
 * When Redis is active, fires-and-forgets the async write.
 */
export function registerQuerySync(hash: string, query: string): void {
  void registerQuery(hash, query);
  // Always write to memory for immediate lookupSync availability
  if (memoryRegistry.has(hash)) {
    memoryRegistry.delete(hash);
  } else if (memoryRegistry.size >= MAX_REGISTRY_SIZE) {
    const oldest = memoryRegistry.keys().next().value;
    if (oldest !== undefined) {
      memoryRegistry.delete(oldest);
    }
  }
  memoryRegistry.set(hash, query);
}

/**
 * Synchronous lookup — checks memory first, then Redis asynchronously.
 * Returns from memory cache; Redis results are populated on next call.
 */
export function lookupQuerySync(hash: string): string | undefined {
  const memResult = memoryRegistry.get(hash);
  if (memResult) return memResult;

  // Async Redis lookup — populate memory cache for next call
  if (redisReady) {
    void lookupQuery(hash).then((result) => {
      if (result) {
        memoryRegistry.set(hash, result);
      }
    });
  }

  return undefined;
}

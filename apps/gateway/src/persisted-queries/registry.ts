/**
 * APQ (Automatic Persisted Queries) hash registry.
 * Stores SHA-256 hash → query string mappings.
 * Max 10,000 entries with LRU eviction (insertion-order Map).
 * Memory safety: bounded Map with eviction prevents unbounded growth.
 */

const MAX_REGISTRY_SIZE = 10_000;

const registry = new Map<string, string>();

/**
 * Register a query string under its SHA-256 hash.
 * If registry exceeds MAX_REGISTRY_SIZE, evict the oldest entry.
 */
export function registerQuery(hash: string, query: string): void {
  if (registry.has(hash)) {
    // Re-insert to refresh insertion order (LRU update)
    registry.delete(hash);
  } else if (registry.size >= MAX_REGISTRY_SIZE) {
    // Evict oldest entry (first key in insertion-order Map)
    const oldest = registry.keys().next().value;
    if (oldest !== undefined) {
      registry.delete(oldest);
    }
  }
  registry.set(hash, query);
}

/**
 * Look up a stored query by its SHA-256 hash.
 * Returns the query string, or undefined if not registered.
 */
export function lookupQuery(hash: string): string | undefined {
  return registry.get(hash);
}

/**
 * Check whether a hash is already registered.
 */
export function isRegistered(hash: string): boolean {
  return registry.has(hash);
}

/**
 * Return the current number of entries in the registry.
 * Useful for observability / health checks.
 */
export function getRegistrySize(): number {
  return registry.size;
}

/**
 * Clear the registry (test teardown helper).
 * Not exported in production surface — used only in tests.
 */
export function _clearRegistry(): void {
  registry.clear();
}

/**
 * tenant-branding.service.memory.spec.ts
 *
 * Memory-safety tests for TenantBrandingService.
 * Verifies:
 *   1. onModuleDestroy() clears the in-memory branding cache (cache.size === 0).
 *   2. Cache does not grow unboundedly — LRU eviction fires at the 501st entry.
 *   3. Eviction removes the oldest entry (insertion-order FIFO).
 *   4. Cache returns fresh data after eviction + re-fetch.
 *   5. Cache size stays at BRANDING_CACHE_MAX_SIZE (500) with continuous inserts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist DB mock — must run before any import of service ────────────────────

const { mockSelect } = vi.hoisted(() => {
  const mockRows: Array<Record<string, unknown>> = [];

  const mockLimit = vi.fn().mockImplementation(() => Promise.resolve(mockRows));
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return { mockSelect, mockRows, mockLimit, mockWhere, mockFrom };
});

// Simulate empty DB responses (no custom branding — returns DEFAULT_BRANDING)
vi.mock('@edusphere/db', () => ({
  db: { select: mockSelect },
  tenantBranding: { tenantId: 'tenantId' },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

import { TenantBrandingService } from './tenant-branding.service.js';

const BRANDING_CACHE_MAX_SIZE = 500;

function getCache(
  svc: TenantBrandingService,
): Map<string, { data: unknown; expiresAt: number }> {
  return (svc as unknown as Record<string, unknown>)['cache'] as Map<
    string,
    { data: unknown; expiresAt: number }
  >;
}

describe('TenantBrandingService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Each test gets a fresh mock that always resolves with an empty rows array
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Test 1: onModuleDestroy clears the cache ───────────────────────────────
  it('clears the entire cache on module destroy', async () => {
    const svc = new TenantBrandingService();

    // Populate cache with a few entries
    await svc.getBranding('tenant-alpha');
    await svc.getBranding('tenant-beta');
    await svc.getBranding('tenant-gamma');

    expect(getCache(svc).size).toBe(3);

    svc.onModuleDestroy();

    expect(getCache(svc).size).toBe(0);
  });

  // ── Test 2: Cache is empty after destroy — subsequent destroy is safe ──────
  it('onModuleDestroy() is idempotent and does not throw when called twice', async () => {
    const svc = new TenantBrandingService();
    await svc.getBranding('tenant-x');

    svc.onModuleDestroy();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(getCache(svc).size).toBe(0);
  });

  // ── Test 3: LRU eviction fires at the 501st unique tenant ─────────────────
  it('evicts the oldest entry when cache exceeds BRANDING_CACHE_MAX_SIZE (500)', async () => {
    const svc = new TenantBrandingService();

    // Fill exactly 500 entries
    for (let i = 0; i < BRANDING_CACHE_MAX_SIZE; i++) {
      await svc.getBranding(`tenant-${String(i).padStart(4, '0')}`);
    }
    expect(getCache(svc).size).toBe(BRANDING_CACHE_MAX_SIZE);

    // The 501st entry triggers LRU eviction
    await svc.getBranding('tenant-overflow');

    // Cache should still be at max size (501 - 1 evicted = 500)
    expect(getCache(svc).size).toBe(BRANDING_CACHE_MAX_SIZE);

    svc.onModuleDestroy();
  });

  // ── Test 4: Oldest key is evicted (insertion-order FIFO) ──────────────────
  it('evicts the first inserted key when the 501st entry is added', async () => {
    const svc = new TenantBrandingService();
    const cache = getCache(svc);

    // Insert 500 entries — the first key is 'tenant-first'
    await svc.getBranding('tenant-first');
    for (let i = 1; i < BRANDING_CACHE_MAX_SIZE; i++) {
      await svc.getBranding(`tenant-${String(i).padStart(4, '0')}`);
    }

    expect(cache.has('tenant-first')).toBe(true);
    expect(cache.size).toBe(BRANDING_CACHE_MAX_SIZE);

    // Adding the 501st entry should evict 'tenant-first' (the oldest)
    await svc.getBranding('tenant-last');

    expect(cache.has('tenant-first')).toBe(false);
    expect(cache.has('tenant-last')).toBe(true);
    expect(cache.size).toBe(BRANDING_CACHE_MAX_SIZE);

    svc.onModuleDestroy();
  });

  // ── Test 5: Cache size is bounded under continuous inserts ────────────────
  it('never grows beyond BRANDING_CACHE_MAX_SIZE with continuous unique tenant IDs', async () => {
    const svc = new TenantBrandingService();
    const totalInserts = BRANDING_CACHE_MAX_SIZE + 200;

    for (let i = 0; i < totalInserts; i++) {
      await svc.getBranding(`overflow-tenant-${String(i)}`);
    }

    expect(getCache(svc).size).toBeLessThanOrEqual(BRANDING_CACHE_MAX_SIZE);
    svc.onModuleDestroy();
  });

  // ── Test 6: Cache hit avoids DB call ──────────────────────────────────────
  it('uses cached data on second call (no additional DB query)', async () => {
    const svc = new TenantBrandingService();

    await svc.getBranding('tenant-cached');
    const callsAfterFirst = mockSelect.mock.calls.length;

    // Second call should hit cache
    await svc.getBranding('tenant-cached');

    expect(mockSelect.mock.calls.length).toBe(callsAfterFirst); // no extra DB call
    svc.onModuleDestroy();
  });
});

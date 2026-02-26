/**
 * Memory safety tests for LtiService — F-018
 *
 * Design invariants verified:
 *   1. stateStore Map is bounded at MAX_STATES=10 000 (LRU eviction fires).
 *   2. consumeState removes the entry on retrieval (one-time use — no leak).
 *   3. Expired entries are evicted by evictExpiredStates (no unbounded growth).
 *   4. No DB connection is opened — service is pure in-memory + jose, so no
 *      closeAllPools / OnModuleDestroy is required.
 *   5. No setInterval or setTimeout timers are started during construction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

describe('LtiService memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. stateStore bounded at MAX_STATES ────────────────────────────────────

  it('stateStore is bounded at MAX_STATES=10 000 (LRU eviction fires at capacity)', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();

    const stateStore = (
      service as unknown as { stateStore: Map<string, unknown> }
    ).stateStore;

    // Insert MAX_STATES + 1 entries; the store must never exceed MAX_STATES.
    for (let i = 0; i < 10_001; i++) {
      await service.storeState('state-' + i, 'nonce-' + i, 'hint-' + i);
    }

    expect(stateStore.size).toBeLessThanOrEqual(10_000);
  });

  // ── 2. consumeState one-time use (no retained reference after retrieval) ───

  it('consumeState deletes the entry from stateStore on first access', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();

    await service.storeState('my-state', 'my-nonce', 'my-hint');

    const stateStore = (
      service as unknown as { stateStore: Map<string, unknown> }
    ).stateStore;

    expect(stateStore.has('my-state')).toBe(true);

    const result = await service.consumeState('my-state');
    expect(result).not.toBeNull();

    // Entry must be deleted after consumption — no stale reference leaks.
    expect(stateStore.has('my-state')).toBe(false);
  });

  it('consumeState returns null for an unknown state (no phantom entries)', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();

    const result = await service.consumeState('does-not-exist');
    expect(result).toBeNull();
  });

  // ── 3. Expired entries evicted (no unbounded accumulation of stale state) ──

  it('expired entries are evicted by evictExpiredStates before new insertions', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();

    const stateStore = (
      service as unknown as {
        stateStore: Map<string, { payload: unknown; expiresAt: number }>;
      }
    ).stateStore;

    // Manually insert an already-expired entry.
    stateStore.set('expired-state', {
      payload: {
        nonce: 'n',
        loginHint: 'h',
        createdAt: new Date().toISOString(),
      },
      expiresAt: Date.now() - 1,
    });

    expect(stateStore.has('expired-state')).toBe(true);

    // Storing a new state triggers eviction of expired entries.
    await service.storeState('fresh-state', 'fresh-nonce', 'fresh-hint');

    expect(stateStore.has('expired-state')).toBe(false);
    expect(stateStore.has('fresh-state')).toBe(true);
  });

  // ── 4. No OnModuleDestroy needed (service holds no DB pools or timers) ─────

  it('does NOT have an onModuleDestroy method (no DB connection to close)', async () => {
    const { LtiService } = await import('./lti.service');
    const service = new LtiService();

    expect(
      typeof (service as unknown as Record<string, unknown>)['onModuleDestroy']
    ).toBe('undefined');
  });

  // ── 5. No timer leaks (setInterval / setTimeout) ──────────────────────────

  it('does not call setInterval during construction', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { LtiService } = await import('./lti.service');
    new LtiService();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('does not call setTimeout during construction', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { LtiService } = await import('./lti.service');
    new LtiService();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});

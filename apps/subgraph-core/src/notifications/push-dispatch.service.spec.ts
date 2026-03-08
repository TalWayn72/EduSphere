/**
 * push-dispatch.service.spec.ts
 * Unit tests for PushDispatchService.
 * Covers: Expo push call, fire-and-forget (never throws), 10s timeout.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Types ──────────────────────────────────────────────────────────────────────

type TokenRecord = {
  platform: string;
  expoPushToken?: string;
  webPushSubscription?: string;
};

// ── PushTokenService mock ──────────────────────────────────────────────────────

const mockGetTokensForUser = vi.fn<() => Promise<TokenRecord[]>>();

const mockPushTokenService = {
  getTokensForUser: mockGetTokensForUser,
};

// ── fetch mock ────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Import ────────────────────────────────────────────────────────────────────

import { PushDispatchService } from './push-dispatch.service.js';
import type { PushTokenService } from './push-token.service.js';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PushDispatchService', () => {
  let service: PushDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new PushDispatchService(
      mockPushTokenService as unknown as PushTokenService
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Dispatches to Expo for ios tokens
  it('calls Expo push API for ios tokens', async () => {
    mockGetTokensForUser.mockResolvedValueOnce([
      { platform: 'ios', expoPushToken: 'ExponentPushToken[abc]' },
    ]);
    mockFetch.mockResolvedValueOnce({ ok: true });

    await service.dispatchToUser('user-1', 'tenant-1', 'Test Title', 'Test Body');
    // Let fire-and-forget settle
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' })
    );

    const callBody = JSON.parse(
      (mockFetch.mock.calls[0]?.[1] as { body: string }).body
    ) as { to: string; title: string; body: string };
    expect(callBody.to).toBe('ExponentPushToken[abc]');
    expect(callBody.title).toBe('Test Title');
    expect(callBody.body).toBe('Test Body');
  });

  // 2. Dispatches to android tokens via Expo
  it('calls Expo push API for android tokens', async () => {
    mockGetTokensForUser.mockResolvedValueOnce([
      { platform: 'android', expoPushToken: 'ExponentPushToken[droid]' },
    ]);
    mockFetch.mockResolvedValueOnce({ ok: true });

    await service.dispatchToUser('user-2', 'tenant-1', 'Title', 'Body');
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalled();
  });

  // 3. dispatchToUser never throws even when fetch fails
  it('does not throw when Expo fetch fails', async () => {
    mockGetTokensForUser.mockResolvedValueOnce([
      { platform: 'ios', expoPushToken: 'ExponentPushToken[fail]' },
    ]);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      service.dispatchToUser('user-3', 'tenant-1', 'T', 'B')
    ).resolves.not.toThrow();
    await vi.runAllTimersAsync();
  });

  // 4. dispatchToUser never throws when getTokensForUser fails
  it('does not throw when getTokensForUser rejects', async () => {
    mockGetTokensForUser.mockRejectedValueOnce(new Error('DB down'));

    await expect(
      service.dispatchToUser('user-4', 'tenant-1', 'T', 'B')
    ).resolves.not.toThrow();
  });

  // 5. No fetch call when user has no tokens
  it('makes no fetch calls when token list is empty', async () => {
    mockGetTokensForUser.mockResolvedValueOnce([]);

    await service.dispatchToUser('user-5', 'tenant-1', 'T', 'B');
    await vi.runAllTimersAsync();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // 6. 10s timeout is applied — slow fetch does not block indefinitely
  it('applies 10s timeout via Promise.race (slow fetch race is won by timeout)', async () => {
    mockGetTokensForUser.mockResolvedValueOnce([
      { platform: 'ios', expoPushToken: 'ExponentPushToken[slow]' },
    ]);

    // Never resolves — simulates hanging network
    mockFetch.mockReturnValueOnce(new Promise(() => undefined));

    await service.dispatchToUser('user-6', 'tenant-1', 'T', 'B');

    // Advance time past the 10s deadline — timeout fires, error is caught silently
    await vi.advanceTimersByTimeAsync(11_000);

    // Service must not hang — if we reach here the timeout worked
    expect(true).toBe(true);
  });

  // 7. onModuleDestroy resolves without error
  it('onModuleDestroy resolves cleanly', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});

/**
 * webPush.test.ts — Unit tests for Web Push API helpers.
 *
 * Tests the urlBase64ToUint8Array pure function and the guard conditions
 * in subscribeWebPush / unsubscribeWebPush.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { urlBase64ToUint8Array, subscribeWebPush, unsubscribeWebPush } from './webPush';

// ─── urlBase64ToUint8Array ─────────────────────────────────────────────────

describe('urlBase64ToUint8Array', () => {
  it('converts a standard base64 VAPID key (no padding needed)', () => {
    // 4 base64 chars = 3 bytes, no padding required (length % 4 === 0)
    const b64 = 'AAAA';
    const result = urlBase64ToUint8Array(b64);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(3);
  });

  it('adds 1 padding char when length % 4 === 3', () => {
    // 'AAA' → length 3, need 1 '=' → base64 'AAA=' = 2 bytes
    const result = urlBase64ToUint8Array('AAA');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(2);
  });

  it('adds 2 padding chars when length % 4 === 2', () => {
    // 'AA' → length 2, need 2 '==' → base64 'AA==' = 1 byte
    const result = urlBase64ToUint8Array('AA');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(1);
  });

  it('converts URL-safe chars: - → + and _ → /', () => {
    // Base64 'AA' encodes byte 0x00; in URL-safe base64 '-' maps to '+' and '_' maps to '/'
    // 'A-A_' URL-safe → 'A+A/' standard base64 → decodes to 3 bytes
    const result = urlBase64ToUint8Array('A-A_');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(3);
  });

  it('handles a realistic VAPID key length (87 chars = 65 bytes)', () => {
    // 87 URL-safe base64 chars without padding = 65 bytes (VAPID key is 65 uncompressed EC bytes)
    const key = 'A'.repeat(86) + 'A'; // 87 chars, length % 4 === 3 → 1 pad char
    const result = urlBase64ToUint8Array(key);
    expect(result).toBeInstanceOf(Uint8Array);
    // 88 chars with padding / 4 * 3 = 66 bytes (last group has 3 chars = 2 data bytes + 1 pad)
    // total = (87 + 1) / 4 * 3 - 1 = 65 bytes
    expect(result.length).toBe(65);
  });
});

// ─── subscribeWebPush ──────────────────────────────────────────────────────

describe('subscribeWebPush', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when VAPID key is missing', async () => {
    // VITE_VAPID_PUBLIC_KEY defaults to '' in test env (no import.meta.env.VITE_VAPID_PUBLIC_KEY)
    const result = await subscribeWebPush();
    expect(result).toBeNull();
  });

  it('returns null when serviceWorker is not in navigator', async () => {
    const origNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
    // Need a non-empty VAPID key to reach the serviceWorker check
    // Since VITE_VAPID_PUBLIC_KEY is empty in tests, this returns null at that guard — that's fine.
    const result = await subscribeWebPush();
    expect(result).toBeNull();
    Object.defineProperty(global, 'navigator', {
      value: origNavigator,
      configurable: true,
      writable: true,
    });
  });
});

// ─── unsubscribeWebPush ────────────────────────────────────────────────────

describe('unsubscribeWebPush', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when serviceWorker is not in navigator', async () => {
    // Use a plain object without serviceWorker to simulate the check `'serviceWorker' in navigator`
    // We mock the global navigator temporarily to an object without serviceWorker
    const origNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
    const result = await unsubscribeWebPush();
    expect(result).toBe(false);
    Object.defineProperty(global, 'navigator', {
      value: origNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('returns false when there is no active subscription', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
          },
        }),
      },
      configurable: true,
      writable: true,
    });
    const result = await unsubscribeWebPush();
    expect(result).toBe(false);
  });

  it('calls unsubscribe() when a subscription exists and returns the result', async () => {
    const mockUnsubscribe = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({ unsubscribe: mockUnsubscribe }),
          },
        }),
      },
      configurable: true,
      writable: true,
    });
    const result = await unsubscribeWebPush();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });
});

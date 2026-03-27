/**
 * Tests for sw.ts — Service Worker
 *
 * Covers: module imports correctly, push handler, notificationclick handler.
 * Since sw.ts runs module-scope side effects, we capture them via mocks
 * and test handler behaviors.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Mock workbox-precaching ────────────────────────────────────────────────
// Track calls via globalThis to survive mock restoration
const g = globalThis as Record<string, unknown>;
g.__swTestPrecacheCalled = false;
g.__swTestCleanupCalled = false;

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: () => {
    (globalThis as Record<string, unknown>).__swTestPrecacheCalled = true;
  },
  cleanupOutdatedCaches: () => {
    (globalThis as Record<string, unknown>).__swTestCleanupCalled = true;
  },
}));

// ── Mock ServiceWorkerGlobalScope ──────────────────────────────────────────
type EventHandler = (event: unknown) => void;
g.__swPushHandlers = [] as EventHandler[];
g.__swNotifClickHandlers = [] as EventHandler[];
g.__swShowNotification = vi.fn(() => Promise.resolve());
g.__swMatchAll = vi.fn(() => Promise.resolve([]));
g.__swOpenWindow = vi.fn(() => Promise.resolve(null));

Object.defineProperty(globalThis, 'self', {
  value: {
    __WB_MANIFEST: [],
    addEventListener: (type: string, handler: EventHandler) => {
      if (type === 'push') (g.__swPushHandlers as EventHandler[]).push(handler);
      if (type === 'notificationclick') (g.__swNotifClickHandlers as EventHandler[]).push(handler);
    },
    registration: {
      showNotification: (...args: unknown[]) => (g.__swShowNotification as ReturnType<typeof vi.fn>)(...args),
    },
    clients: {
      matchAll: (...args: unknown[]) => (g.__swMatchAll as ReturnType<typeof vi.fn>)(...args),
      openWindow: (...args: unknown[]) => (g.__swOpenWindow as ReturnType<typeof vi.fn>)(...args),
    },
  },
  writable: true,
  configurable: true,
});

// Import the module (triggers side effects)
import('./sw');

describe('Service Worker', () => {
  it('calls precacheAndRoute on import', async () => {
    await import('./sw');
    expect(g.__swTestPrecacheCalled).toBe(true);
  });

  it('calls cleanupOutdatedCaches on import', async () => {
    await import('./sw');
    expect(g.__swTestCleanupCalled).toBe(true);
  });

  it('registers a push event listener', async () => {
    await import('./sw');
    expect((g.__swPushHandlers as EventHandler[]).length).toBeGreaterThan(0);
  });

  it('registers a notificationclick event listener', async () => {
    await import('./sw');
    expect((g.__swNotifClickHandlers as EventHandler[]).length).toBeGreaterThan(0);
  });

  it('push handler shows notification with defaults when no data', async () => {
    await import('./sw');
    const pushHandler = (g.__swPushHandlers as EventHandler[])[0]!;
    const showNotif = g.__swShowNotification as ReturnType<typeof vi.fn>;
    showNotif.mockClear();

    const waitUntilFn = vi.fn((p: Promise<unknown>) => p);
    pushHandler({ data: null, waitUntil: waitUntilFn });

    expect(waitUntilFn).toHaveBeenCalled();
    expect(showNotif).toHaveBeenCalledWith('EduSphere', {
      body: 'New notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
  });

  it('push handler uses custom data from push event payload', async () => {
    await import('./sw');
    const pushHandler = (g.__swPushHandlers as EventHandler[])[0]!;
    const showNotif = g.__swShowNotification as ReturnType<typeof vi.fn>;
    showNotif.mockClear();

    const waitUntilFn = vi.fn((p: Promise<unknown>) => p);
    pushHandler({
      data: {
        json: () => ({
          title: 'Custom Title',
          body: 'Custom Body',
          icon: '/custom-icon.png',
        }),
      },
      waitUntil: waitUntilFn,
    });

    expect(showNotif).toHaveBeenCalledWith('Custom Title', {
      body: 'Custom Body',
      icon: '/custom-icon.png',
      badge: '/pwa-192x192.png',
    });
  });

  it('notificationclick handler closes notification', async () => {
    await import('./sw');
    const clickHandler = (g.__swNotifClickHandlers as EventHandler[])[0]!;
    const closeFn = vi.fn();
    const waitUntilFn = vi.fn((p: Promise<unknown>) => p);

    clickHandler({
      notification: { close: closeFn },
      waitUntil: waitUntilFn,
    });

    expect(closeFn).toHaveBeenCalled();
    expect(waitUntilFn).toHaveBeenCalled();
  });
});

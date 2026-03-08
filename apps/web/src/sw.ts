/* eslint-disable no-undef */
/**
 * sw.ts — Custom Service Worker (EduSphere PWA)
 *
 * Uses VitePWA injectManifest strategy so Workbox precaching is combined
 * with our custom push notification handler.
 *
 * Workbox injects the precache manifest into this file at build time.
 */
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox injects the precache manifest here at build time.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Push notification handler ──────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  let title = 'EduSphere';
  let body = 'New notification';
  let icon = '/pwa-192x192.png';

  try {
    const data = event.data?.json() as
      | { title?: string; body?: string; icon?: string }
      | undefined;
    if (data?.title) title = data.title;
    if (data?.body) body = data.body;
    if (data?.icon) icon = data.icon;
  } catch {
    // Non-JSON payload — use defaults above
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/pwa-192x192.png',
    })
  );
});

// ── Notification click handler ─────────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes('/'));
        if (existing) return existing.focus();
        return self.clients.openWindow('/notifications');
      })
  );
});

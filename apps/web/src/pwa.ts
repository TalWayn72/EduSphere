/**
 * pwa.ts — Service Worker registration helper.
 * Registers the Workbox-generated service worker in production only.
 * In development, the SW is disabled (devOptions.enabled: false in vite.config.ts).
 *
 * autoUpdate mode: new SW activates immediately (no user prompt) — suitable for
 * an SPA where the user does not hold unsaved in-flight form state between SW updates.
 */
import { registerSW } from 'virtual:pwa-register';

/**
 * Listen for messages relayed from the service worker
 * (e.g. PUSH_RECEIVED events forwarded to the main thread).
 */
function registerSwMessageListener(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if ((event.data as { type?: string } | undefined)?.type === 'PUSH_RECEIVED') {
      // Reserved for future use: update badge counts or refresh notification list
    }
  });
}

export function registerServiceWorker(): void {
  registerSwMessageListener();

  if (import.meta.env.PROD) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // autoUpdate is set in vite.config.ts — SW will self-update without prompting.
        // No UI action required; workbox will take over on next fetch.
      },
      onOfflineReady() {
        // App is fully cached and ready for offline use.
        // OfflineBanner in Layout.tsx handles the offline indicator for users.
      },
      onRegistered(registration) {
        if (registration) {
          // Periodically check for SW updates every hour.
          setInterval(
            () => {
              registration.update().catch(() => {
                // Network unavailable during update check — silently ignore.
              });
            },
            60 * 60 * 1000
          );
        }
      },
    });
  }
}

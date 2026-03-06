/**
 * pwa.ts — Service Worker registration helper.
 * Registers the Workbox-generated service worker in production only.
 * In development, the SW is disabled (devOptions.enabled: false in vite.config.ts).
 *
 * autoUpdate mode: new SW activates immediately (no user prompt) — suitable for
 * an SPA where the user does not hold unsaved in-flight form state between SW updates.
 */
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker(): void {
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

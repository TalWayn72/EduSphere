/**
 * pwa.ts — Service Worker registration helper.
 * Registers the Workbox-generated service worker in production only.
 * In development, the SW is disabled (devOptions.enabled: false in vite.config.ts).
 */
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker(): void {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
  }
}

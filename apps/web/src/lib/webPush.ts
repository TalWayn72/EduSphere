/* eslint-disable no-undef */
/**
 * webPush.ts — Web Push API helpers.
 *
 * Handles browser-side subscription lifecycle:
 *  - subscribeWebPush()   → request permission + subscribe via PushManager
 *  - unsubscribeWebPush() → unsubscribe and remove from PushManager
 *
 * Requires VITE_VAPID_PUBLIC_KEY in the environment.
 */

// VAPID public key from env — required for Web Push API
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

/**
 * Subscribe to Web Push notifications.
 * Returns the serialized PushSubscription as a JSON string,
 * or null if permission is denied / VAPID key missing / API unavailable.
 */
export async function subscribeWebPush(): Promise<string | null> {
  if (
    !VAPID_PUBLIC_KEY ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as Uint8Array<ArrayBuffer>,
  });

  return JSON.stringify(subscription);
}

/**
 * Unsubscribe from Web Push notifications.
 * Returns true if the subscription was successfully removed, false otherwise.
 */
export async function unsubscribeWebPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  return subscription.unsubscribe();
}

/**
 * Convert a URL-safe base64-encoded VAPID public key to a Uint8Array.
 * Required by PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

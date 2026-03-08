// web-vitals is not installed — this is a no-op stub.
// To enable real Core Web Vitals reporting:
// 1. pnpm --filter @edusphere/web add web-vitals
// 2. Replace this stub with the full implementation below:
//
// import type { Metric } from 'web-vitals';
// import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';
//
// const VITALS_ENDPOINT = import.meta.env.VITE_VITALS_ENDPOINT ?? '/api/vitals';
//
// function sendVital({ name, value, id }: Metric): void {
//   if (!navigator.sendBeacon) return;
//   navigator.sendBeacon(
//     VITALS_ENDPOINT,
//     JSON.stringify({ name, value, id, url: location.pathname, timestamp: Date.now() })
//   );
// }
//
// export function reportWebVitals(): void {
//   onCLS(sendVital);
//   onFID(sendVital);
//   onLCP(sendVital);
//   onFCP(sendVital);
//   onTTFB(sendVital);
// }

export function reportWebVitals(): void {
  // no-op stub — web-vitals not installed
  // Install: pnpm --filter @edusphere/web add web-vitals
}

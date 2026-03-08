import type { Metric } from 'web-vitals';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function reportWebVitals(): void {
  const endpoint = import.meta.env.VITE_VITALS_ENDPOINT as string | undefined;
  if (!endpoint) return;

  const send = (metric: Metric): void => {
    navigator.sendBeacon(endpoint, JSON.stringify(metric));
  };

  onCLS(send);
  onINP(send); // INP replaces FID in web-vitals v4+ (Core Web Vital)
  onLCP(send);
  onFCP(send);
  onTTFB(send);
}

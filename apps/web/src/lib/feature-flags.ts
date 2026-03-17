/**
 * Feature flags — resolved from Vite environment variables at build time.
 * Each flag defaults to `true` so features are ON unless explicitly disabled.
 *
 * Usage:  import { ENABLE_PIPELINE_SUBSCRIPTIONS } from '@/lib/feature-flags';
 */

const envFlag = (key: string, fallback = true): boolean => {
  const raw = import.meta.env[key] as string | undefined;
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true';
};

/** Guards WebSocket subscription path; fallback = polling when disabled. */
export const ENABLE_PIPELINE_SUBSCRIPTIONS = envFlag('VITE_ENABLE_PIPELINE_SUBSCRIPTIONS');

/** Guards NER-to-AGE knowledge-graph bridge. */
export const ENABLE_NER_BRIDGE = envFlag('VITE_ENABLE_NER_BRIDGE');

/** Guards course publish-readiness validation panel. */
export const ENABLE_PUBLISH_READINESS = envFlag('VITE_ENABLE_PUBLISH_READINESS');

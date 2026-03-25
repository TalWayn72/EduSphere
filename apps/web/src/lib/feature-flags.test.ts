/**
 * feature-flags tests
 *
 * Verifies:
 *  1. ENABLE_PIPELINE_SUBSCRIPTIONS defaults to true
 *  2. ENABLE_NER_BRIDGE defaults to true
 *  3. ENABLE_PUBLISH_READINESS defaults to true
 *  4. All flags are boolean
 */
import { describe, it, expect } from 'vitest';
import {
  ENABLE_PIPELINE_SUBSCRIPTIONS,
  ENABLE_NER_BRIDGE,
  ENABLE_PUBLISH_READINESS,
} from './feature-flags';

describe('feature-flags', () => {
  it('ENABLE_PIPELINE_SUBSCRIPTIONS is a boolean', () => {
    expect(typeof ENABLE_PIPELINE_SUBSCRIPTIONS).toBe('boolean');
  });

  it('ENABLE_NER_BRIDGE is a boolean', () => {
    expect(typeof ENABLE_NER_BRIDGE).toBe('boolean');
  });

  it('ENABLE_PUBLISH_READINESS is a boolean', () => {
    expect(typeof ENABLE_PUBLISH_READINESS).toBe('boolean');
  });

  it('flags default to true when env vars are not set', () => {
    // In the test environment, VITE_* env vars are not set,
    // so envFlag should return the fallback (true)
    expect(ENABLE_PIPELINE_SUBSCRIPTIONS).toBe(true);
    expect(ENABLE_NER_BRIDGE).toBe(true);
    expect(ENABLE_PUBLISH_READINESS).toBe(true);
  });
});

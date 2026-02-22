/**
 * G-12 Security Test: Keycloak Brute Force Protection
 *
 * Static configuration test — validates the Keycloak realm JSON enforces
 * brute force protection settings required by the security baseline.
 * No running Keycloak instance is required; this reads the committed JSON.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const REALM_PATH = resolve(
  join(import.meta.dirname, '../../infrastructure/docker/keycloak-realm.json'),
);

interface KeycloakRealm {
  bruteForceProtected: boolean;
  permanentLockout: boolean;
  maxFailureWaitSeconds: number;
  minimumQuickLoginWaitSeconds: number;
  waitIncrementSeconds: number;
  quickLoginCheckMilliSeconds: number;
  maxDeltaTimeSeconds: number;
  failureFactor: number;
  sslRequired: string;
  accessTokenLifespan: number;
  [key: string]: unknown;
}

function loadRealm(): KeycloakRealm {
  const raw = readFileSync(REALM_PATH, 'utf-8');
  return JSON.parse(raw) as KeycloakRealm;
}

describe('Keycloak realm security configuration (G-12)', () => {
  let realm: KeycloakRealm;

  beforeAll(() => {
    realm = loadRealm();
  });

  it('has bruteForceProtected enabled', () => {
    expect(realm.bruteForceProtected).toBe(true);
  });

  it('has failureFactor of 5 or fewer allowed attempts', () => {
    expect(realm.failureFactor).toBeGreaterThan(0);
    expect(realm.failureFactor).toBeLessThanOrEqual(5);
  });

  it('does not use permanent lockout', () => {
    expect(realm.permanentLockout).toBe(false);
  });

  it('requires SSL for external connections (not "none")', () => {
    expect(['external', 'all']).toContain(realm.sslRequired);
  });

  it('accessTokenLifespan is 900 seconds (15 min) or less', () => {
    expect(realm.accessTokenLifespan).toBeGreaterThan(0);
    expect(realm.accessTokenLifespan).toBeLessThanOrEqual(900);
  });

  it('maxFailureWaitSeconds is set to a reasonable cap (900 s = 15 min)', () => {
    expect(realm.maxFailureWaitSeconds).toBeLessThanOrEqual(900);
  });

  it('maxDeltaTimeSeconds resets brute-force counter within 12 hours', () => {
    // 43200 = 12 hours; value must be positive and at most 12 h
    expect(realm.maxDeltaTimeSeconds).toBeGreaterThan(0);
    expect(realm.maxDeltaTimeSeconds).toBeLessThanOrEqual(43200);
  });
});

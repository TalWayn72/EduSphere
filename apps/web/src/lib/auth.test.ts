/**
 * Unit tests for auth.ts
 *
 * Covers:
 *  1. DEV_MODE behaviour (VITE_DEV_MODE=true or missing VITE_KEYCLOAK_URL)
 *  2. Double-init guard — React 18 StrictMode calls initKeycloak() twice;
 *     the second call must NOT throw "A 'Keycloak' instance can only be
 *     initialized once."
 *  3. Genuine Keycloak errors are re-thrown (no silent DEV_MODE fallback)
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Keycloak mock factory
// ---------------------------------------------------------------------------

const makeKeycloakMock = (initResult: boolean | Error) => ({
  init: vi.fn().mockImplementation(() =>
    initResult instanceof Error
      ? Promise.reject(initResult)
      : Promise.resolve(initResult),
  ),
  authenticated: initResult === true,
  token: initResult === true ? 'mock-token' : undefined,
  tokenParsed: initResult === true ? { sub: 'user-1' } : null,
  login: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn().mockResolvedValue(false),
});

/**
 * Wrap a mock instance in a proper constructor function (not an arrow fn).
 * Arrow functions cannot be used with `new`, so `vi.fn(() => mock)` throws
 * "is not a constructor" when auth.ts calls `new Keycloak(config)` at
 * module-load time. Using a regular function fixes this.
 */
function makeConstructor(instance: ReturnType<typeof makeKeycloakMock>) {
  return vi.fn().mockImplementation(function () {
    return instance;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stubKeycloakEnv(devMode: string = 'false') {
  vi.stubEnv('VITE_DEV_MODE', devMode);
  vi.stubEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080');
  vi.stubEnv('VITE_KEYCLOAK_REALM', 'edusphere');
  vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'edusphere-web');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth — DEV_MODE', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('initKeycloak() succeeds immediately when VITE_DEV_MODE=true', async () => {
    vi.stubEnv('VITE_DEV_MODE', 'true');
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080');

    const { initKeycloak } = await import('@/lib/auth');
    const result = await initKeycloak();
    expect(result).toBe(true);
  });

  it('keycloak singleton is null in DEV_MODE', async () => {
    vi.stubEnv('VITE_DEV_MODE', 'true');
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080');

    const { keycloak } = await import('@/lib/auth');
    expect(keycloak).toBeNull();
  });

  it('isAuthenticated() returns true after initKeycloak() in DEV_MODE', async () => {
    vi.stubEnv('VITE_DEV_MODE', 'true');
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080');

    const { initKeycloak, isAuthenticated } = await import('@/lib/auth');
    await initKeycloak();
    expect(isAuthenticated()).toBe(true);
  });
});

describe('auth — double-init guard (React StrictMode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('calling initKeycloak() twice sequentially does NOT call init() more than once', async () => {
    stubKeycloakEnv('false');

    const keycloakMock = makeKeycloakMock(false);
    vi.doMock('keycloak-js', () => ({ default: makeConstructor(keycloakMock) }));

    const { initKeycloak } = await import('@/lib/auth');

    // First call — should initialise
    await expect(initKeycloak()).resolves.toBe(false);

    // Second call — must NOT throw (the guard returns the resolved promise)
    await expect(initKeycloak()).resolves.toBe(false);

    // Keycloak.init() must have been called exactly once
    expect(keycloakMock.init).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls (StrictMode double-effect) both wait for the same init()', async () => {
    stubKeycloakEnv('false');

    // Slow init to simulate a real async operation so both concurrent
    // calls are in-flight simultaneously (the key StrictMode scenario)
    const keycloakMock = makeKeycloakMock(false);
    keycloakMock.init = vi.fn().mockImplementation(
      () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10)),
    );
    vi.doMock('keycloak-js', () => ({ default: makeConstructor(keycloakMock) }));

    const { initKeycloak } = await import('@/lib/auth');

    // Fire both calls simultaneously — simulates StrictMode double-effect
    const [first, second] = await Promise.all([initKeycloak(), initKeycloak()]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    // init() must have been called exactly once — not twice
    expect(keycloakMock.init).toHaveBeenCalledTimes(1);
  });

  it('second call returns current authenticated state without re-initialising', async () => {
    stubKeycloakEnv('false');

    const keycloakMock = makeKeycloakMock(true);
    vi.doMock('keycloak-js', () => ({ default: makeConstructor(keycloakMock) }));

    const { initKeycloak } = await import('@/lib/auth');

    const first = await initKeycloak();
    const second = await initKeycloak();

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(keycloakMock.init).toHaveBeenCalledTimes(1);
  });
});

describe('auth — genuine Keycloak errors are re-thrown', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('initKeycloak() re-throws when Keycloak.init() rejects', async () => {
    stubKeycloakEnv('false');

    const networkError = new Error('Network error: Keycloak unreachable');
    const keycloakMock = makeKeycloakMock(networkError);
    vi.doMock('keycloak-js', () => ({ default: makeConstructor(keycloakMock) }));

    const { initKeycloak } = await import('@/lib/auth');

    await expect(initKeycloak()).rejects.toThrow('Network error: Keycloak unreachable');
  });

  it('initPromise resets to null after a genuine error (allows retry)', async () => {
    stubKeycloakEnv('false');

    let callCount = 0;
    const keycloakMock = makeKeycloakMock(false);
    keycloakMock.init = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? Promise.reject(new Error('Network error'))
        : Promise.resolve(false);
    });

    vi.doMock('keycloak-js', () => ({ default: makeConstructor(keycloakMock) }));

    const { initKeycloak } = await import('@/lib/auth');

    // First call — fails, guard resets
    await expect(initKeycloak()).rejects.toThrow('Network error');

    // Second call — should retry (init called again), not short-circuit via guard
    await expect(initKeycloak()).resolves.toBe(false);

    expect(keycloakMock.init).toHaveBeenCalledTimes(2);
  });
});

/**
 * Keycloak Real Login E2E Tests
 *
 * Tests the full OIDC Authorization Code + PKCE flow against a live Keycloak
 * instance (localhost:8080, realm: edusphere).
 *
 * Prerequisites:
 *   - Keycloak running: docker-compose up -d
 *   - Realm imported with demo users (infrastructure/docker/keycloak-realm.json)
 *   - Passwords set via kcadm.sh set-password
 *   - VITE_DEV_MODE=false (uses real Keycloak, not mock)
 *
 * Run:
 *   VITE_DEV_MODE=false pnpm --filter @edusphere/web test:e2e --project=chromium \
 *     --grep "keycloak"
 *
 * Regression:
 *   SEC-KC-001 — "A 'Keycloak' instance can only be initialized once"
 *   Root cause: React 18 StrictMode called initKeycloak() twice, triggering a
 *   second keycloak.init() on the same singleton → exception → silent DEV_MODE
 *   fallback. Fix: keycloakInitialized guard in auth.ts.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Credentials (demo users from keycloak-realm.json)
// ---------------------------------------------------------------------------

const USERS = {
  student:    { email: 'student@example.com',         password: 'Student123!',     role: 'STUDENT' },
  instructor: { email: 'instructor@example.com',      password: 'Instructor123!',  role: 'INSTRUCTOR' },
  superAdmin: { email: 'super.admin@edusphere.dev',   password: 'SuperAdmin123!',  role: 'SUPER_ADMIN' },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fill and submit the Keycloak login form. */
async function loginViaKeycloak(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Wait for Keycloak login page
  await page.waitForURL(/localhost:8080\/realms\/edusphere/, { timeout: 15_000 });
  await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 });

  await page.fill('#username', email);
  await page.fill('#password', password);
  await page.click('#kc-login');
}

/** Assert that no Keycloak console errors appeared on the app side. */
async function assertNoKeycloakInitError(page: Page): Promise<void> {
  // Collect console errors during the test
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Give time for any async errors to surface
  await page.waitForTimeout(500);

  const doubleInitError = errors.find((e) =>
    e.includes('can only be initialized once'),
  );
  expect(
    doubleInitError,
    'Expected no "can only be initialized once" error — double-init guard must prevent this',
  ).toBeUndefined();
}

// ---------------------------------------------------------------------------
// Test: No double-init error on page load (regression SEC-KC-001)
// ---------------------------------------------------------------------------

test.describe('Keycloak — init guard (SEC-KC-001 regression)', () => {
  test('login page loads without "Keycloak instance initialized once" console error', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Allow StrictMode double-effect to fire
    await page.waitForTimeout(1_000);

    const doubleInitError = errors.find((e) =>
      e.includes('can only be initialized once'),
    );
    expect(
      doubleInitError,
      `Console error found: "${doubleInitError}" — SEC-KC-001 regression`,
    ).toBeUndefined();
  });

  test('no "Falling back to DEV MODE" warning when VITE_DEV_MODE=false', async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'warn')
        warnings.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1_000);

    const devModeFallback = warnings.find((w) =>
      w.includes('Falling back to DEV MODE'),
    );
    expect(
      devModeFallback,
      'Expected no DEV MODE fallback — Keycloak init should succeed cleanly',
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test: Login page UI
// ---------------------------------------------------------------------------

test.describe('Keycloak — login page', () => {
  test('shows EduSphere branding and Sign In button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Welcome to EduSphere' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sign In with Keycloak/i }),
    ).toBeVisible();
  });

  test('Sign In button redirects to Keycloak', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Sign In with Keycloak/i }).click();

    await page.waitForURL(/localhost:8080\/realms\/edusphere/, {
      timeout: 15_000,
    });
    await expect(page.locator('#username')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Test: Full login flow — student
// ---------------------------------------------------------------------------

test.describe('Keycloak — full login flow', () => {
  test('student can log in and reach the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /Sign In with Keycloak/i }).click();
    await loginViaKeycloak(page, USERS.student.email, USERS.student.password);

    // Keycloak redirects back with the PKCE code. Wait for the router to
    // navigate away from the callback URL (# fragment) to the actual route.
    // We do NOT use networkidle here because ContentViewer opens a persistent
    // WebSocket subscription that never settles.
    await page.waitForURL(/localhost/, { timeout: 20_000 });
    // Wait for the router to render (URL changes from /#code=... to /learn/... or /login)
    await page.waitForURL(/\/(learn|courses|dashboard|login)/, { timeout: 25_000 });

    // Confirm we are NOT back on /login — user is authenticated.
    expect(page.url()).not.toMatch(/\/login/);

    // Navigate to /dashboard via a full page load. The silentCheckSsoRedirectUri
    // restores the Keycloak session via a hidden iframe (prompt=none), so the
    // user remains authenticated without being redirected to /login.
    await page.goto('/dashboard');
    // Wait for the Dashboard heading — signals the page rendered (authenticated).
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible({ timeout: 25_000 });

    await assertNoKeycloakInitError(page);
  });

  test('invalid credentials show Keycloak error message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Sign In with Keycloak/i }).click();
    await page.waitForURL(/localhost:8080\/realms\/edusphere/, { timeout: 15_000 });

    await page.fill('#username', 'student@example.com');
    await page.fill('#password', 'WrongPassword999!');
    await page.click('#kc-login');

    await expect(
      page.getByText(/invalid username or password/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('instructor can log in and reach the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /Sign In with Keycloak/i }).click();
    await loginViaKeycloak(
      page,
      USERS.instructor.email,
      USERS.instructor.password,
    );

    await page.waitForURL(/localhost/, { timeout: 20_000 });
    await page.waitForURL(/\/(learn|courses|dashboard|login)/, { timeout: 25_000 });
    expect(page.url()).not.toMatch(/\/login/);

    // Navigate to /dashboard via full page load; silent SSO restores the session.
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible({ timeout: 25_000 });
  });
});

// ---------------------------------------------------------------------------
// Test: Protected routes redirect unauthenticated users
// ---------------------------------------------------------------------------

test.describe('Keycloak — protected routes', () => {
  test('unauthenticated user visiting /dashboard is redirected to /login', async ({
    page,
  }) => {
    // Fresh browser context — no Keycloak session
    await page.goto('/dashboard');

    // Should redirect to /login (ProtectedRoute) or to Keycloak
    await page.waitForURL(/\/(login|realms)/, { timeout: 15_000 });

    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('/realms/edusphere');
    expect(isLoginPage).toBe(true);
  });
});

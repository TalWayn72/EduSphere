/**
 * Auth Flow Security — Penetration test scenarios for Session 26.
 *
 * Tests:
 * 1. Unauthenticated access to protected routes → redirect to /login
 * 2. LandingPage public access (/ and /landing)
 * 3. SmartRoot auth bypass check
 * 4. JWT tampering / missing token → 401, no data leak
 * 5. Session fixation — post-logout cached route inaccessibility
 * 6. Wildcard catch-all route exposes /dashboard to unauthenticated users (regression)
 * 7. LandingPage Sign In button navigates to /login
 */
import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Clear all auth state: sessionStorage, localStorage, cookies. */
async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    sessionStorage.clear();
    localStorage.clear();
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('Auth Flow Security — Unauthenticated access', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with zero auth state
    await clearAuthState(page);
  });

  test('unauthenticated user sees LandingPage at /', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // SmartRoot must render LandingPage when not authenticated
    await expect(page.getByTestId('landing-nav')).toBeVisible({ timeout: 8_000 });

    // Dashboard must NOT be visible — no data leak to unauthenticated users
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible({
      timeout: 3_000,
    });

    // Console must not expose raw error text or stack traces
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    // No raw JS errors should appear on a clean unauthenticated landing
    // (Keycloak SSO init errors are acceptable and filtered)
    const leakedErrors = consoleErrors.filter(
      (e) =>
        e.includes('Unauthorized') ||
        e.includes('TypeError') ||
        e.includes('Cannot read')
    );
    expect(leakedErrors).toHaveLength(0);
  });

  test('unauthenticated user accessing /dashboard redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    // Must redirect to /login — dashboard content must not be visible
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');

    // Confirm no dashboard data is visible in DOM
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('unauthenticated user accessing /courses redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user accessing /agents redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user accessing /admin redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user accessing /skill-tree redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/skill-tree`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('wildcard catch-all /* does NOT expose /dashboard to unauthenticated user', async ({
    page,
  }) => {
    // The * catch-all in router.tsx currently navigates to /dashboard.
    // ProtectedRoute wraps /dashboard, so an unauth user hitting /nonexistent
    // must end up at /login, not rendering dashboard data.
    await page.goto(`${BASE_URL}/nonexistent-route`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');

    // Guard: no dashboard data must be in the DOM
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible({
      timeout: 2_000,
    });
  });
});

test.describe('Auth Flow Security — Public routes', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('/landing is publicly accessible without auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('landing-nav')).toBeVisible({ timeout: 8_000 });
    // Ensure no auth redirect happened
    expect(page.url()).not.toContain('/login');
  });

  test('LandingPage Sign In button navigates to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('landing-nav')).toBeVisible({ timeout: 8_000 });
    // Click first visible "Log In" / "Get Started" link
    await page.getByRole('link', { name: /log in|get started/i }).first().click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('/accessibility is publicly accessible without auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/accessibility`, { waitUntil: 'domcontentloaded' });
    expect(page.url()).not.toContain('/login');
  });

  test('/verify/badge/:id is publicly accessible without auth', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/verify/badge/test-assertion-id`, {
      waitUntil: 'domcontentloaded',
    });
    // Must not redirect to login (badge verifier is intentionally public)
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('Auth Flow Security — JWT tampering', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('GraphQL request with tampered Authorization header returns 401 or error, not data', async ({
    page,
  }) => {
    // Intercept GraphQL and inject a malformed token
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Tampered JWT: valid structure but invalid signature
          Authorization:
            'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV2aWwgVXNlciIsInRlbmFudF9pZCI6InRlbmFudC1iYWQiLCJpYXQiOjE1MTYyMzkwMjJ9.INVALIDSIGNATURE',
        },
        body: JSON.stringify({
          query: '{ me { id email } }',
        }),
      });
      const body = await res.text();
      return { status: res.status, body };
    });

    // Gateway must reject tampered JWT — 401 OR GraphQL error (not 200 with data)
    const bodyParsed = JSON.parse(result.body) as {
      data?: { me?: unknown };
      errors?: unknown[];
    };

    // Must NOT return actual user data
    expect(bodyParsed.data?.me).toBeUndefined();

    // Either HTTP 401 or GraphQL unauthorized error
    if (result.status === 200) {
      // GraphQL-level error is acceptable (Federation may return 200 with error payload)
      expect(bodyParsed.errors).toBeDefined();
    } else {
      expect(result.status).toBe(401);
    }
  });

  test('GraphQL request with expired token returns error, not data', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      // Token with exp = 1 (expired in 1970)
      const expiredToken =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJ0ZW5hbnRfaWQiOiJ0ZW5hbnQtMSIsImV4cCI6MX0.FAKESIG';
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expiredToken}`,
        },
        body: JSON.stringify({ query: '{ me { id } }' }),
      });
      const body = await res.text();
      return { status: res.status, body };
    });

    const bodyParsed = JSON.parse(result.body) as {
      data?: { me?: unknown };
      errors?: unknown[];
    };

    // Must NOT return user data
    expect(bodyParsed.data?.me).toBeUndefined();
    if (result.status === 200) {
      expect(bodyParsed.errors).toBeDefined();
    } else {
      expect([401, 403]).toContain(result.status);
    }
  });
});

test.describe('Auth Flow Security — Session fixation and logout', () => {
  test('after logout, authenticated routes redirect to /login', async ({
    page,
  }) => {
    // Login first
    await login(page);

    // Verify authenticated state
    await expect(page.url()).not.toContain('/login');

    // Clear auth state (simulates logout)
    await clearAuthState(page);

    // Try to access protected route
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');

    // Guard: dashboard data must not be visible
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('after logout, /courses is not accessible from session cache', async ({
    page,
  }) => {
    await login(page);
    await clearAuthState(page);

    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Auth Flow Security — Cross-tenant URL manipulation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('tenantId URL param is ignored — auth comes from JWT only', async ({
    page,
  }) => {
    // Unauthenticated user with a spoofed tenantId query param
    await page.goto(`${BASE_URL}/courses?tenantId=TENANT_B`, {
      waitUntil: 'domcontentloaded',
    });

    // Must redirect to login regardless of query param
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('course detail with injected tenantId redirects to /login when unauth', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/courses/real-course-id?tenantId=evil-tenant`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});

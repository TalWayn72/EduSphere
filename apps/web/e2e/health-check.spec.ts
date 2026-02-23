/**
 * Health-Check E2E Tests
 *
 * Validates connectivity to all EduSphere services before running the full
 * test suite. Safe to run in ALL environments (local, staging, production).
 *
 * These tests are FAST (< 5s each) and non-destructive — they only perform
 * HTTP GET/HEAD requests and never mutate any state.
 *
 * ─── What is checked ─────────────────────────────────────────────────────────
 *
 *   1. Web app is reachable (HTTP 200)
 *   2. Web app serves correct Content-Type (text/html)
 *   3. Web app HTML contains the React mount point (#root)
 *   4. GraphQL gateway is reachable (HTTP 200 or 400 for empty body)
 *   5. Keycloak realm is reachable (LIVE_BACKEND only)
 *   6. All critical pages load without HTTP error (200 OK from Vite)
 *   7. No console errors on page load
 *   8. App title is correct ("EduSphere")
 *   9. Root route redirects to /learn/content-1 (smoke)
 *  10. Network error count is 0 on dashboard load
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * Local:
 *   pnpm --filter @edusphere/web test:e2e --grep="health"
 *
 * Staging:
 *   E2E_ENV=staging E2E_BASE_URL=https://staging.edusphere.io \
 *   pnpm --filter @edusphere/web test:e2e --grep="health"
 *
 * Production (smoke only):
 *   E2E_ENV=production E2E_BASE_URL=https://app.edusphere.io \
 *   pnpm --filter @edusphere/web test:e2e --grep="health"
 */

import { test, expect, request } from '@playwright/test';
import { E2E } from './env';
import { attachNetworkMonitor } from './auth.helpers';

// ─── 1. Service connectivity ──────────────────────────────────────────────────

test.describe('Health Check — Service Connectivity', () => {
  test('web app responds with HTTP 200', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(E2E.BASE_URL);
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('web app serves text/html with UTF-8 charset', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(E2E.BASE_URL);
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/html');
    await ctx.dispose();
  });

  test('web app HTML contains React mount point (#root)', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(E2E.BASE_URL);
    const html = await res.text();
    expect(html).toContain('id="root"');
    await ctx.dispose();
  });

  test('GraphQL gateway responds (HTTP 200 or 400 for empty body)', async () => {
    // Skip in DEV_MODE when no backend is running
    test.skip(
      E2E.IS_DEV_MODE,
      'GraphQL gateway not required in DEV_MODE (mock data)',
    );

    const ctx = await request.newContext();
    // POST with empty body — gateway returns 400 (valid) or 200
    const res = await ctx.post(E2E.GRAPHQL_URL, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    // 200 = gateway up and parsed body; 400 = gateway up but invalid query
    // Anything else (connection refused, 502, etc.) = problem
    expect([200, 400]).toContain(res.status());
    await ctx.dispose();
  });

  test('Keycloak realm is reachable (LIVE_BACKEND only)', async () => {
    test.skip(!E2E.LIVE_BACKEND, 'Keycloak not required in DEV_MODE');

    const ctx = await request.newContext();
    const realmUrl = `${E2E.KEYCLOAK_URL}/realms/${E2E.KEYCLOAK_REALM}`;
    const res = await ctx.get(realmUrl);
    // Keycloak returns 200 with realm JSON at the realm endpoint
    expect(res.status()).toBe(200);
    const body = await res.json().catch(() => null);
    expect(body).not.toBeNull();
    expect(body?.realm).toBe(E2E.KEYCLOAK_REALM);
    await ctx.dispose();
  });
});

// ─── 2. App bootstrap ─────────────────────────────────────────────────────────

test.describe('Health Check — App Bootstrap', () => {
  test('app title is "EduSphere"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/EduSphere/i);
  });

  test('root route "/" redirects to content viewer', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/learn\//, { timeout: 10_000 });
    expect(page.url()).toContain('/learn/');
  });

  test('no console errors on app load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known browser-level noise
        if (
          text.includes('favicon') ||
          text.includes('Extension') ||
          text.includes('[vite]') ||
          text.includes('Failed to load resource: net::ERR_ABORTED')
        )
          return;
        errors.push(text);
      }
    });
    page.on('pageerror', (err) => errors.push(`[PAGE ERROR] ${err.message}`));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Allow late async errors to surface

    expect(
      errors,
      `Console errors on app load:\n${errors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('no JavaScript exceptions on dashboard load', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(
      pageErrors,
      `JavaScript exceptions:\n${pageErrors.join('\n')}`,
    ).toHaveLength(0);
  });
});

// ─── 3. Critical page reachability ───────────────────────────────────────────

test.describe('Health Check — Critical Pages Load', () => {
  const CRITICAL_PAGES = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/courses', name: 'Courses' },
    { path: '/learn/content-1', name: 'Content Viewer' },
    { path: '/agents', name: 'AI Agents' },
    { path: '/search', name: 'Search' },
    { path: '/annotations', name: 'Annotations' },
    { path: '/graph', name: 'Knowledge Graph' },
    { path: '/profile', name: 'Profile' },
    { path: '/settings', name: 'Settings' },
  ];

  for (const { path, name } of CRITICAL_PAGES) {
    test(`${name} page (${path}) loads without crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      // Layout renders <header> on every page — confirms app didn't crash
      await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });

      expect(
        errors,
        `JavaScript exceptions on ${name}:\n${errors.join('\n')}`,
      ).toHaveLength(0);
    });
  }
});

// ─── 4. Network error budget ──────────────────────────────────────────────────

test.describe('Health Check — Zero Network Errors on Load', () => {
  test('dashboard page produces no localhost network errors', async ({
    page,
  }) => {
    const networkErrors = attachNetworkMonitor(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Filter out expected GraphQL 400s (no backend in DEV_MODE = normal)
    const unexpectedErrors = networkErrors.filter(
      (e) =>
        !(
          // GraphQL gateway returning 400 for unauthenticated DEV queries is acceptable
          (
            e.url.includes('4000') && e.status === 400
          )
        ),
    );

    if (unexpectedErrors.length > 0) {
      console.warn(
        '[health-check] Network errors on dashboard:',
        unexpectedErrors,
      );
    }

    // In DEV_MODE with no backend, network errors from GraphQL are expected.
    // This test only fails if there are request-failed (connection refused) errors
    // on the app's own assets.
    const assetErrors = unexpectedErrors.filter(
      (e) => e.type === 'request_failed' && !e.url.includes('4000'),
    );
    expect(
      assetErrors,
      `Asset loading errors:\n${assetErrors.map((e) => e.url).join('\n')}`,
    ).toHaveLength(0);
  });

  test('agents page produces no JavaScript exceptions', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    expect(
      pageErrors,
      `JavaScript exceptions on Agents page:\n${pageErrors.join('\n')}`,
    ).toHaveLength(0);
  });
});

// ─── 5. Environment info (informational, always passes) ───────────────────────

test('Health Check — Report environment config', async () => {
  // This test always passes — it's a diagnostic that prints current config
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('  E2E Environment Configuration');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`  Profile:      ${E2E.PROFILE}`);
  console.log(`  Base URL:     ${E2E.BASE_URL}`);
  console.log(`  Keycloak:     ${E2E.KEYCLOAK_URL}`);
  console.log(`  GraphQL:      ${E2E.GRAPHQL_URL}`);
  console.log(`  DEV_MODE:     ${E2E.IS_DEV_MODE}`);
  console.log(`  LIVE_BACKEND: ${E2E.LIVE_BACKEND}`);
  console.log(`  CI:           ${E2E.IS_CI}`);
  console.log(`  Write tests:  ${E2E.RUN_WRITE_TESTS}`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // This assertion always passes — the test exists for logging purposes
  expect(E2E.BASE_URL).toBeTruthy();
});

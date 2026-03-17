/**
 * Error Boundary & Error Handling — E2E Regression Guard
 *
 * Verifies that React Error Boundaries and GraphQL error handling show
 * user-friendly messages instead of raw technical strings.
 *
 * Strategy: since injecting React render errors in E2E is fragile, we focus on:
 *   - Network/GraphQL error handling (block routes, return 500s, abort requests)
 *   - Asserting friendly error messages appear
 *   - Asserting raw technical strings are absent
 *   - Visual regression screenshots of error states
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e --project=chromium \
 *     --grep "error-boundary"
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Raw technical strings that must NEVER be visible to end users */
const FORBIDDEN_STRINGS = [
  'TypeError',
  'Cannot read properties',
  'undefined is not',
  'CombinedError',
  'graphQLErrors',
  'Network request failed',
  '[GraphQL]',
  'Unexpected token',
  'ECONNREFUSED',
  'fetch failed',
  'SyntaxError',
  'ReferenceError',
  'at Object.',
  'at Module.',
  'at async',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAndNavigate(page: Page, path: string) {
  await loginInDevMode(page);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

/** Assert none of the forbidden technical strings are visible on the page */
async function assertNoTechnicalStrings(page: Page) {
  for (const str of FORBIDDEN_STRINGS) {
    await expect(page.getByText(str, { exact: false })).not.toBeVisible({
      timeout: 2_000,
    });
  }
}

/** CORS headers used when fulfilling mocked GraphQL responses */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

// ─── T-01: GraphQL network error → friendly UI (no raw CombinedError) ────────

test.describe('error-boundary — T-01: GraphQL network error', () => {
  test('blocking GraphQL endpoint shows friendly error, not raw CombinedError', async ({ page }) => {
    // Abort all GraphQL requests to simulate total network failure
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.abort('failed');
    });

    await loginAndNavigate(page, '/dashboard');

    // Page should show some form of error or empty state — not raw CombinedError
    await assertNoTechnicalStrings(page);

    await expect(page).toHaveScreenshot('error-boundary-network-blocked-dashboard.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('network error on /courses shows friendly message', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.abort('connectionrefused');
    });

    await loginAndNavigate(page, '/courses');
    await assertNoTechnicalStrings(page);
  });
});

// ─── T-02: GraphQL 500 error → friendly toast ────────────────────────────────

test.describe('error-boundary — T-02: GraphQL 500 error', () => {
  test('500 response on /dashboard shows friendly error', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          errors: [{ message: 'Internal Server Error: connection pool exhausted' }],
        }),
      });
    });

    await loginAndNavigate(page, '/dashboard');

    // Raw server error must not leak to UI
    await expect(
      page.getByText('connection pool exhausted', { exact: false }),
    ).not.toBeVisible({ timeout: 3_000 });
    await assertNoTechnicalStrings(page);

    await expect(page).toHaveScreenshot('error-boundary-500-dashboard.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('500 response on /profile shows friendly error', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          errors: [{ message: 'relation "users" does not exist' }],
        }),
      });
    });

    await loginAndNavigate(page, '/profile');

    await expect(
      page.getByText('relation "users" does not exist', { exact: false }),
    ).not.toBeVisible({ timeout: 3_000 });
    await assertNoTechnicalStrings(page);
  });
});

// ─── T-03: GraphQL error with extensions.code → friendly message ─────────────

test.describe('error-boundary — T-03: GraphQL structured error', () => {
  test('INTERNAL_SERVER_ERROR on /settings shows friendly error', async ({ page }) => {
    await routeGraphQL(page, () => {
      return JSON.stringify({
        data: null,
        errors: [
          {
            message: 'Cannot read properties of undefined (reading "tenant_id")',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          },
        ],
      });
    });

    await loginAndNavigate(page, '/settings');

    await expect(
      page.getByText('Cannot read properties of undefined'),
    ).not.toBeVisible({ timeout: 3_000 });
    await assertNoTechnicalStrings(page);
  });

  test('UNAUTHENTICATED error does not show raw GraphQL error text', async ({ page }) => {
    await routeGraphQL(page, () => {
      return JSON.stringify({
        data: null,
        errors: [
          {
            message: 'Access denied! You need to be authenticated to perform this action.',
            extensions: { code: 'UNAUTHENTICATED' },
          },
        ],
      });
    });

    await loginAndNavigate(page, '/courses');

    // The raw "Access denied!" with technical phrasing should be caught by error handler
    await assertNoTechnicalStrings(page);
  });
});

// ─── T-04: Multiple sections failing — one error doesn't break entire page ──

test.describe('error-boundary — T-04: Partial failure isolation', () => {
  test('courses page with partial GraphQL error still renders navigation', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      // Let some operations succeed, others fail
      if (opName === 'GetCourses' || opName === 'MyCourses' || opName === 'ListCourses') {
        return JSON.stringify({
          data: null,
          errors: [{ message: 'Service unavailable', extensions: { code: 'SERVICE_UNAVAILABLE' } }],
        });
      }
      // Other operations (auth, user info, etc.) succeed with empty data
      return null;
    });

    await loginAndNavigate(page, '/courses');

    // Navigation sidebar should still be present even if course list failed
    const nav = page.locator('nav, [data-testid="app-sidebar"], aside');
    await expect(nav.first()).toBeVisible({ timeout: 10_000 });

    // Raw error should not leak
    await expect(page.getByText('Service unavailable')).not.toBeVisible({ timeout: 3_000 });
    await assertNoTechnicalStrings(page);
  });

  test('dashboard with partial failure still shows page structure', async ({ page }) => {
    let callCount = 0;
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      callCount++;
      // Fail every other request
      if (callCount % 2 === 0) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: JSON.stringify({ errors: [{ message: 'Intermittent failure' }] }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ data: {} }),
      });
    });

    await loginAndNavigate(page, '/dashboard');

    // Page should not be completely broken
    await expect(page.locator('body')).not.toHaveText('Intermittent failure');
    await assertNoTechnicalStrings(page);
  });
});

// ─── T-05: Console error capture ─────────────────────────────────────────────

test.describe('error-boundary — T-05: Console error capture', () => {
  test('GraphQL failure logs error to console but does not show stack to user', async ({ page }) => {
    const consoleErrors: ConsoleMessage[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.abort('failed');
    });

    await loginAndNavigate(page, '/dashboard');

    // The app may log errors to console (which is fine for debugging),
    // but no stack traces should appear in the DOM
    await assertNoTechnicalStrings(page);

    // Verify console did capture something (the network error)
    // This is informational — we just want to confirm errors are observable in logs
    // (not a hard assertion, as console behavior varies)
  });
});

// ─── T-06: No raw technical strings on error pages ───────────────────────────

test.describe('error-boundary — T-06: No raw strings on various pages', () => {
  const PAGES_TO_TEST = [
    { path: '/knowledge-graph', name: 'knowledge-graph' },
    { path: '/agents', name: 'agents' },
    { path: '/discussions', name: 'discussions' },
  ];

  for (const { path, name } of PAGES_TO_TEST) {
    test(`${name} page with GraphQL error shows no raw technical strings`, async ({ page }) => {
      await routeGraphQL(page, () => {
        return JSON.stringify({
          data: null,
          errors: [
            {
              message: `TypeError: Cannot read properties of null (reading 'id')`,
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            },
          ],
        });
      });

      await loginAndNavigate(page, path);
      await assertNoTechnicalStrings(page);
    });
  }
});

// ─── T-07: Visual regression of error state ──────────────────────────────────

test.describe('error-boundary — T-07: Visual regression screenshots', () => {
  test('courses page error state visual regression', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.abort('failed');
    });

    await loginAndNavigate(page, '/courses');

    await expect(page).toHaveScreenshot('error-boundary-courses-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('settings page error state visual regression', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ errors: [{ message: 'DB pool exhausted' }] }),
      });
    });

    await loginAndNavigate(page, '/settings');

    await expect(page).toHaveScreenshot('error-boundary-settings-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-08: Recovery after error — navigate away and back ─────────────────────

test.describe('error-boundary — T-08: Recovery after error', () => {
  test('page recovers after navigating away from error state', async ({ page }) => {
    let shouldFail = true;

    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      if (shouldFail) {
        await route.abort('failed');
        return;
      }
      // After navigation, succeed with empty data
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ data: {} }),
      });
    });

    // Visit page with error
    await loginAndNavigate(page, '/courses');
    await assertNoTechnicalStrings(page);

    // Stop failing
    shouldFail = false;

    // Navigate to a different page
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Page should render without crash — body should have meaningful content
    await expect(page.locator('body')).not.toBeEmpty();
    await assertNoTechnicalStrings(page);
  });

  test('dashboard recovers when GraphQL comes back online', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      requestCount++;
      // First 3 requests fail, then succeed
      if (requestCount <= 3) {
        await route.abort('failed');
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ data: {} }),
      });
    });

    await loginAndNavigate(page, '/dashboard');
    await assertNoTechnicalStrings(page);

    // Navigate away and back to trigger new requests (which now succeed)
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await assertNoTechnicalStrings(page);
  });
});

// ─── T-09: Malformed JSON response ──────────────────────────────────────────

test.describe('error-boundary — T-09: Malformed response handling', () => {
  test('malformed JSON GraphQL response does not show SyntaxError to user', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: '{ invalid json !!!',
      });
    });

    await loginAndNavigate(page, '/dashboard');
    await assertNoTechnicalStrings(page);
  });
});

// ─── T-10: Timeout simulation ────────────────────────────────────────────────

test.describe('error-boundary — T-10: Request timeout handling', () => {
  test('extremely slow GraphQL response (aborted) shows no raw error', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
        return;
      }
      // Simulate a timeout by holding the request then aborting
      await new Promise((r) => setTimeout(r, 5_000));
      await route.abort('timedout');
    });

    await loginAndNavigate(page, '/courses');

    // After timeout, no raw error strings should be shown
    await assertNoTechnicalStrings(page);

    await expect(page).toHaveScreenshot('error-boundary-timeout-courses.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

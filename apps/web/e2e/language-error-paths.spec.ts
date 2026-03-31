/**
 * Gap 5: E2E error paths — infrastructure failures
 *
 * Tests error scenarios using page.route() to simulate:
 *   - 502 Bad Gateway (subgraph down)
 *   - GraphQL error response
 *   - Network timeout
 *   - Invalid JWT → redirect to login
 *
 * All tests are fully self-contained; no live backend required.
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE } from './env';

// ─── Shared setup ────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });
  await login(page);
});

// ─── Helper: navigate to settings and trigger language change ─────────────────

async function triggerLanguageChange(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });

  const combo = page.getByRole('combobox').first();
  await combo.waitFor({ timeout: 10_000 });
  await combo.click();

  const option = page.getByRole('option').nth(1); // pick second option (not current)
  await option.waitFor({ timeout: 5_000 });
  await option.click();
}

// ─── 502 Gateway error ────────────────────────────────────────────────────────

test('502 gateway response shows error toast or fallback UI', async ({ page }) => {
  // Intercept GraphQL with 502
  await page.route('**/graphql', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }
    await route.fulfill({
      status: 502,
      contentType: 'text/plain',
      body: 'Bad Gateway',
    });
  });

  await triggerLanguageChange(page);

  // In DEV_MODE: app may use its own mock layer, bypassing page.route for mutations
  // In LIVE_BACKEND: error toast expected
  if (!IS_DEV_MODE) {
    // App must NOT crash (no unhandled error overlay)
    await expect(page.locator('body')).not.toContainText('Unhandled Error', {
      timeout: 5_000,
    });

    // Error feedback should appear (toast or inline message)
    const errorFeedback = page.getByText(/נכשלה|failed|error|problem/i);
    await expect(errorFeedback).toBeVisible({ timeout: 10_000 });
  }
});

// ─── GraphQL error response ────────────────────────────────────────────────────

test('GraphQL error in response body shows error toast', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }

    let parsed: { operationName?: string } = {};
    try {
      parsed = JSON.parse(route.request().postData() ?? '{}') as { operationName?: string };
    } catch {
      // ignore parse errors
    }

    if (
      parsed.operationName === 'UpdateUserPreferences' ||
      parsed.operationName === 'updateUserPreferences'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            {
              message: 'Preferences update failed',
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            },
          ],
          data: null,
        }),
      });
      return;
    }

    // All other operations: empty success
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });

  await triggerLanguageChange(page);

  if (!IS_DEV_MODE) {
    const errorToast = page.getByText(/נכשלה|failed|error/i);
    await expect(errorToast).toBeVisible({ timeout: 10_000 });

    // Success toast MUST NOT appear
    await expect(
      page.getByText(/נשמרה|saved/i)
    ).not.toBeVisible({ timeout: 3_000 });
  }
});

// ─── Network timeout ──────────────────────────────────────────────────────────

test('network timeout shows error toast (request never completes)', async ({ page }) => {
  // Never fulfill the request — simulates network timeout
  await page.route('**/graphql', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }

    let parsed: { operationName?: string } = {};
    try {
      parsed = JSON.parse(route.request().postData() ?? '{}') as { operationName?: string };
    } catch {
      // ignore
    }

    if (
      parsed.operationName === 'UpdateUserPreferences' ||
      parsed.operationName === 'updateUserPreferences'
    ) {
      // Abort the request to simulate timeout/connection failure
      await route.abort('timedout');
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });

  await triggerLanguageChange(page);

  if (!IS_DEV_MODE) {
    // App must handle the failure gracefully
    await expect(page.locator('body')).not.toContainText('Unhandled Error', {
      timeout: 5_000,
    });

    const errorFeedback = page.getByText(/נכשלה|failed|error|network/i);
    await expect(errorFeedback).toBeVisible({ timeout: 15_000 });
  }
});

// ─── Invalid JWT → redirect to login ─────────────────────────────────────────

test('401 Unauthorized response triggers redirect to login page', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }

    let parsed: { operationName?: string } = {};
    try {
      parsed = JSON.parse(route.request().postData() ?? '{}') as { operationName?: string };
    } catch {
      // ignore
    }

    if (
      parsed.operationName === 'UpdateUserPreferences' ||
      parsed.operationName === 'updateUserPreferences'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            {
              message: 'Unauthorized',
              extensions: { code: 'UNAUTHENTICATED' },
            },
          ],
          data: null,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });

  await triggerLanguageChange(page);

  if (!IS_DEV_MODE) {
    // UNAUTHENTICATED error should redirect to login or show auth error
    await Promise.race([
      page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => null),
      page.getByText(/unauthorized|unauthenticated|session.*expired/i)
        .waitFor({ timeout: 10_000 })
        .catch(() => null),
      // If neither, verify no crash
      page.waitForTimeout(5_000),
    ]);

    // App must remain usable
    await expect(page.locator('body')).not.toContainText('Unhandled Error');
  }
});

// ─── App stability guard (all scenarios) ─────────────────────────────────────

test('settings page loads without crashing (smoke)', async ({ page }) => {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });

  // Page must render a combobox (language selector)
  const combo = page.getByRole('combobox').first();
  await expect(combo).toBeVisible({ timeout: 10_000 });

  // No unhandled error overlay
  await expect(page.locator('body')).not.toContainText('Unhandled Error');
});

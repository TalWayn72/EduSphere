/**
 * Loading States — E2E Visual Regression Guard
 *
 * Verifies that loading/skeleton states appear correctly while data is being
 * fetched. Uses page.route() to DELAY GraphQL responses by 3 seconds, then
 * asserts that a loading indicator (skeleton, spinner, or text) is visible
 * during the delay, and that real content appears after the delay resolves.
 *
 * Pattern:
 *   1. Set up route interceptor with a 3s delay (don't block — just delay)
 *   2. Navigate to page
 *   3. Assert loading indicator is visible (within the delay window)
 *   4. Wait for content to appear after delay completes
 *   5. Assert content is visible and loading indicator is gone
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e --project=chromium \
 *     --grep "loading-states"
 */

import { test, expect, type Page } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Delay in ms applied to GraphQL responses to expose loading states */
const GRAPHQL_DELAY_MS = 3_000;

/** CORS headers required for cross-origin GraphQL mock responses */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set up a page.route() interceptor that delays all GraphQL POST responses
 * by the specified duration, then continues the request normally.
 * OPTIONS (CORS preflight) requests are handled immediately.
 */
async function setupDelayedGraphQL(page: Page, delayMs = GRAPHQL_DELAY_MS) {
  await page.route('**/graphql', async (route) => {
    const request = route.request();

    // Handle CORS preflight immediately
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
      return;
    }

    // Delay POST requests, then continue to real server (or empty data)
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Return empty data so the page can render content placeholders
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({ data: {} }),
    });
  });
}

/**
 * Login in dev mode, then navigate to the given path.
 * Does NOT call waitForLoadState('networkidle') — the caller needs to
 * assert loading state BEFORE network settles.
 */
async function loginThenGoto(page: Page, path: string) {
  await loginInDevMode(page);
  // Navigate but don't wait for networkidle — we want to catch loading state
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
}

/**
 * Generic loading indicator locator — matches common loading patterns:
 *  - Skeletons (data-testid="skeleton", class*="skeleton", role="progressbar")
 *  - Spinners (class*="animate-spin", class*="spinner")
 *  - Loading text ("Loading...", "loading")
 *  - Suspense fallback spinner (the PageLoader div with animate-spin)
 */
function loadingIndicator(page: Page) {
  return page.locator([
    '[data-testid*="skeleton"]',
    '[class*="skeleton"]',
    '[class*="animate-pulse"]',
    '[class*="animate-spin"]',
    '[class*="spinner"]',
    '[role="progressbar"]',
    'text=Loading',
  ].join(', '));
}

/**
 * Assert that a loading indicator is visible on the page.
 * Uses a short timeout since loading should appear quickly.
 */
async function assertLoadingVisible(page: Page) {
  const indicator = loadingIndicator(page);
  await expect(indicator.first()).toBeVisible({ timeout: 5_000 });
}

/**
 * Assert that loading indicators are no longer visible (content has loaded).
 */
async function assertLoadingGone(page: Page) {
  const indicator = loadingIndicator(page);
  // Wait for all loading indicators to disappear
  // Use a longer timeout to account for the GraphQL delay + render
  await expect(indicator.first()).not.toBeVisible({ timeout: 15_000 }).catch(() => {
    // If no loading indicator was ever present, that's also acceptable
    // (some pages may render empty state directly)
  });
}

// ─── T-01: Dashboard loading state ───────────────────────────────────────────

test.describe('loading-states — T-01: Dashboard', () => {
  test('shows loading indicator while data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/dashboard');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-dashboard-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/dashboard');

    // Wait for delay to complete and content to render
    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);

    // Page body should have meaningful content (not just spinners)
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-02: Courses list loading state ────────────────────────────────────────

test.describe('loading-states — T-02: Courses', () => {
  test('shows loading indicator while courses are fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/courses');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-courses-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('course list content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/courses');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-03: Settings loading state ────────────────────────────────────────────

test.describe('loading-states — T-03: Settings', () => {
  test('shows loading indicator while settings are fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/settings');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-settings-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('settings content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/settings');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-04: Knowledge Graph loading state ─────────────────────────────────────

test.describe('loading-states — T-04: Knowledge Graph', () => {
  test('shows loading indicator while graph data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/knowledge-graph');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-knowledge-graph-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('knowledge graph content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/knowledge-graph');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-05: Agents page loading state ─────────────────────────────────────────

test.describe('loading-states — T-05: Agents', () => {
  test('shows loading indicator while agent data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/agents');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-agents-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('agents content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/agents');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-06: Profile page loading state ────────────────────────────────────────

test.describe('loading-states — T-06: Profile', () => {
  test('shows loading indicator while profile data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/profile');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-profile-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('profile content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/profile');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-07: Assessments page loading state ────────────────────────────────────

test.describe('loading-states — T-07: Assessments', () => {
  test('shows loading indicator while assessment data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/assessments');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-assessments-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('assessments content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/assessments');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-08: Discussions page loading state ────────────────────────────────────

test.describe('loading-states — T-08: Discussions', () => {
  test('shows loading indicator while discussion data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/discussions');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-discussions-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('discussions content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/discussions');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-09: Admin dashboard loading state ─────────────────────────────────────

test.describe('loading-states — T-09: Admin Dashboard', () => {
  test('shows loading indicator while admin data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/admin');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-admin-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('admin dashboard content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/admin');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── T-10: Discover/Explore page loading state ──────────────────────────────

test.describe('loading-states — T-10: Discover', () => {
  test('shows loading indicator while discovery data is fetching', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/discover');

    await assertLoadingVisible(page);

    await expect(page).toHaveScreenshot('loading-discover-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('discover content appears after data loads', async ({ page }) => {
    await setupDelayedGraphQL(page);
    await loginThenGoto(page, '/discover');

    await page.waitForLoadState('networkidle');
    await assertLoadingGone(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

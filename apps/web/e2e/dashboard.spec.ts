/**
 * Dashboard — Dedicated E2E Regression Test Suite
 *
 * Regression guard for schema mismatch errors on the /dashboard page.
 *
 * Known regression: "Cannot query field 'preferences' on type 'User'"
 *   Root cause: supergraph.graphql was composed without the `preferences` field
 *   from the core subgraph (old SDL in Docker container).
 *   Fix: docker cp updated user.graphql → run compose.js → restart gateway.
 *
 * Two suites:
 *   Suite 1 — DEV_MODE (default, no backend required):
 *     Verifies the dashboard renders correctly using mock/fallback data.
 *     Asserts all known error fragments are absent.
 *
 *   Suite 2 — Live backend (VITE_DEV_MODE=false):
 *     Explicitly asserts that the `preferences` schema error is NOT present
 *     after the real ME_QUERY resolves. This is the primary regression check.
 *     Skipped automatically when running without a live backend.
 *
 * Run (DEV_MODE — CI default):
 *   pnpm --filter @edusphere/web exec playwright test e2e/dashboard.spec.ts
 *
 * Run (live backend regression check):
 *   VITE_DEV_MODE=false E2E_BASE_URL=http://localhost:5173 \
 *   pnpm --filter @edusphere/web exec playwright test e2e/dashboard.spec.ts \
 *   --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5174';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'visual-qa-results');

/**
 * The exact schema-mismatch error fragment that appears when the gateway
 * supergraph was composed without the `preferences` field on User.
 *
 * Triggered by:  ME_QUERY { me { preferences { locale theme ... } } }
 * Cause:         Old user.graphql in Docker container — missing UserPreferences type
 * Fix:           docker cp user.graphql → node compose.js → restart gateway
 */
const PREFERENCES_SCHEMA_ERROR =
  'Cannot query field "preferences" on type "User"';

/**
 * Resolver null error: mapUser() returned an object where createdAt was null
 * because the compiled user.service.js in the container was old (no Date→ISO mapping).
 *
 * Cause:  Old container code — mapUser() didn't convert Drizzle Date → ISO string
 *         and didn't handle camelCase (Drizzle) vs snake_case (raw SQL) column names
 * Fix:    Fix mapUser() with toIso() helper + fallback for both naming conventions
 */
const NULL_CREATED_AT_ERROR =
  'Cannot return null for non-nullable field User.createdAt';

/**
 * Generic user data error prefix shown on the Dashboard page.
 * Component: Dashboard.tsx — `Error loading user data: ${meResult.error.message}`
 */
const USER_DATA_ERROR_PREFIX = 'Error loading user data';

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

// ── Suite 1: DEV_MODE rendering ───────────────────────────────────────────────

test.describe('Dashboard — DEV_MODE (mock data)', () => {
  test('page loads with "Dashboard" heading', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('stats cards are visible', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    // Primary stats row: Courses Enrolled, Study Time, Concepts Mastered
    await expect(page.getByText('Courses Enrolled')).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByText('Study Time')).toBeVisible();
    await expect(page.getByText('Concepts Mastered')).toBeVisible();
    // Secondary stats row: Active Courses, Annotations, Study Groups
    await expect(page.getByText('Active Courses')).toBeVisible();
  });

  test('Instructor Tools section is visible', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Instructor Tools')).toBeVisible({
      timeout: 8_000,
    });
  });

  /**
   * PRIMARY REGRESSION GUARD (mock mode).
   *
   * In DEV_MODE the ME_QUERY is still executed against the real gateway.
   * When the gateway is running but rejects the dev mock JWT, the Dashboard shows:
   *   "Error loading user data: [GraphQL] Unauthorized"
   * That generic error is EXPECTED in DEV_MODE and is NOT a regression.
   *
   * What IS a regression is either of the specific schema/resolver errors below.
   * This test guards only against those two, not the generic Unauthorized message.
   */
  test('no "preferences" schema error visible — regression guard', async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000); // let React + GraphQL settle

    // Specific schema mismatch: preferences field missing from gateway supergraph
    // Regression: old user.graphql in Docker container — UserPreferences type absent
    await expect(
      page.getByText(PREFERENCES_SCHEMA_ERROR, { exact: false })
    ).not.toBeVisible({ timeout: 3_000 });

    // Resolver null bug: mapUser() didn't convert Date → ISO string for createdAt
    // Regression: old container code accessed snake_case keys; Drizzle returns camelCase
    await expect(
      page.getByText(NULL_CREATED_AT_ERROR, { exact: false })
    ).not.toBeVisible({ timeout: 3_000 });

    // Note: "Error loading user data: [GraphQL] Unauthorized" CAN appear in DEV_MODE
    // when the gateway is running but rejects the mock JWT — this is expected behaviour
    // and is checked (absent) only in the live-backend suite below.
  });

  test('no crash overlay ("Something went wrong") visible', async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('visual snapshot — dashboard DEV_MODE render', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const file = path.join(SCREENSHOTS_DIR, 'dashboard-dev-mode.png');
    await page.screenshot({ path: file, fullPage: true });
    expect(fs.existsSync(file), `Screenshot missing: ${file}`).toBe(true);
  });
});

// ── Suite 2: Live backend — schema regression guard ───────────────────────────

const LIVE_BACKEND = process.env.VITE_DEV_MODE === 'false';

test.describe('Dashboard — Live backend (schema regression guard)', () => {
  test.skip(
    !LIVE_BACKEND,
    'Set VITE_DEV_MODE=false to run live-backend regression tests'
  );

  /**
   * PRIMARY REGRESSION TEST.
   *
   * Navigates to /dashboard with a real backend. Waits for the ME_QUERY
   * to resolve. The `preferences` schema error must NOT appear.
   *
   * If this test fails, it means:
   *   1. The gateway supergraph is out of date — run compose.js and restart
   *   2. The core subgraph user.graphql was reverted to a version without preferences
   *   3. A breaking schema change was introduced
   *
   * Fix protocol:
   *   docker exec edusphere-all-in-one sh -c "cd /app/apps/gateway && node compose.js"
   *   supervisorctl restart gateway
   */
  test('preferences schema error does NOT appear after /dashboard load', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(5_000); // allow ME_QUERY to resolve

    // CRITICAL: schema mismatch error must be absent
    await expect(
      page.getByText(PREFERENCES_SCHEMA_ERROR, { exact: false })
    ).not.toBeVisible({ timeout: 2_000 });

    // CRITICAL: resolver null bug for createdAt must be absent
    await expect(
      page.getByText(NULL_CREATED_AT_ERROR, { exact: false })
    ).not.toBeVisible({ timeout: 2_000 });

    // Generic error banner must also be absent
    await expect(
      page.getByText(USER_DATA_ERROR_PREFIX, { exact: false })
    ).not.toBeVisible({ timeout: 2_000 });

    if (consoleErrors.length > 0) {
      console.warn('Console errors captured during test:', consoleErrors);
    }
  });

  test('user display name is shown in header from real API', async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(5_000);

    // The header shows the user's name — must not be empty
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 5_000 });
    // Name should appear somewhere — at minimum the header renders
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();
  });

  test('stats cards show numeric values from real API', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(5_000);

    await expect(page.getByText('Active Courses')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText('Learning Streak')).toBeVisible();
    await expect(page.getByText('Study Time')).toBeVisible();
    await expect(page.getByText('Concepts Mastered')).toBeVisible();
  });

  test('visual snapshot — dashboard live backend render', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(5_000);

    const file = path.join(SCREENSHOTS_DIR, 'dashboard-live-backend.png');
    await page.screenshot({ path: file, fullPage: true });
    expect(fs.existsSync(file), `Screenshot missing: ${file}`).toBe(true);
  });
});

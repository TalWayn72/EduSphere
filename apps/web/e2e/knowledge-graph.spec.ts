/**
 * Knowledge Graph — Dedicated E2E Test Suite
 *
 * Regression guard for the recurring AGE 1.7.0 + PostgreSQL 17 incompatibility:
 *   "Failed to load graph: [GraphQL] third argument of cypher function must be a parameter"
 *
 * Two suites:
 *   Suite 1 — DEV_MODE (default, no backend required):
 *     Verifies the graph page renders correctly using mock data.
 *     Asserts the AGE error banner is absent even in mock mode.
 *
 *   Suite 2 — Live backend (VITE_DEV_MODE=false):
 *     Explicitly asserts the specific AGE error text is NOT present after
 *     the real GraphQL query resolves. This is the primary regression check.
 *     Skipped automatically when running without a live backend.
 *
 * Run (DEV_MODE, no backend needed — CI default):
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-graph.spec.ts
 *
 * Run (live backend regression check):
 *   VITE_DEV_MODE=false E2E_BASE_URL=http://localhost:5173 \
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-graph.spec.ts \
 *   --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5174';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'visual-qa-results');

/**
 * The exact AGE 1.7.0 + PG-17 error fragment.
 * If this string ever appears on /graph, it means executeCypher() fallback broke.
 */
const AGE_PG17_ERROR = 'third argument of cypher function must be a parameter';

/**
 * Drizzle ORM SET LOCAL parameterization error.
 * Appears when withTenantContext uses sql`SET LOCAL ... = ${var}` (template literal)
 * instead of sql.raw(`SET LOCAL ... = '${esc(var)}'`).
 * PostgreSQL rejects parameterized SET LOCAL commands.
 */
const SET_LOCAL_PARAM_ERROR = 'SET LOCAL app.current_tenant = $1';

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

// ── Suite 1: DEV_MODE mock-data rendering ─────────────────────────────────────

test.describe('Knowledge Graph — DEV_MODE (mock data)', () => {
  test('page loads with "Knowledge Graph" heading', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Knowledge Graph' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('SVG graph element is visible', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10_000 });
  });

  test('graph statistics panel shows Nodes and Edges counts', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Graph Statistics')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Nodes')).toBeVisible();
    await expect(page.getByText('Edges')).toBeVisible();
  });

  test('search input is present and accepts text', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    const searchInput = page.getByPlaceholder('Search concepts...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill('Jewish');
    await expect(searchInput).toHaveValue('Jewish');
  });

  test('Learning Path panel is visible', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Learning Path')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder('From concept...')).toBeVisible();
    await expect(page.getByPlaceholder('To concept...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Find Path' })).toBeVisible();
  });

  /**
   * PRIMARY REGRESSION GUARD (mock mode).
   *
   * Even in DEV_MODE the query is paused, so the backend is never called.
   * Asserts both the generic banner and the specific AGE error fragment are absent.
   */
  test('no AGE error banner visible — mock mode regression guard', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000); // ensure React has settled

    // Generic "Failed to load graph" text must not appear
    await expect(page.getByText('Failed to load graph', { exact: false })).not.toBeVisible({
      timeout: 3_000,
    });

    // Specific AGE 1.7.0 + PG-17 error fragment must not appear
    await expect(page.getByText(AGE_PG17_ERROR, { exact: false })).not.toBeVisible({
      timeout: 3_000,
    });

    // Drizzle parameterized SET LOCAL error must not appear
    // (caused by sql`SET LOCAL ... = ${var}` instead of sql.raw())
    await expect(page.getByText(SET_LOCAL_PARAM_ERROR, { exact: false })).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('no crash overlay ("Something went wrong") visible', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5_000 });
  });

  test('visual snapshot — DEV_MODE graph render', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000); // let CSS transitions settle

    const file = path.join(SCREENSHOTS_DIR, 'knowledge-graph-dev-mode.png');
    await page.screenshot({ path: file, fullPage: true });

    // Confirm snapshot was written — failure here means disk/permission issue
    expect(fs.existsSync(file), `Screenshot missing: ${file}`).toBe(true);
  });
});

// ── Suite 2: Live backend — AGE regression guard ──────────────────────────────

// True when the caller explicitly sets VITE_DEV_MODE=false (live backend required).
const LIVE_BACKEND = process.env.VITE_DEV_MODE === 'false';

test.describe('Knowledge Graph — Live backend (AGE 1.7.0 + PG-17 regression guard)', () => {
  test.skip(!LIVE_BACKEND, 'Set VITE_DEV_MODE=false to run live-backend regression tests');

  /**
   * PRIMARY REGRESSION TEST.
   *
   * Navigates to /graph with a real backend. Waits for the GraphQL concepts
   * query to complete. The AGE error string must NOT appear in the DOM.
   *
   * If this test fails, it means:
   *   1. executeCypher() fallback was removed or broken, OR
   *   2. A new AGE / PostgreSQL incompatibility was introduced.
   *
   * Fix: verify packages/db/src/graph/client.ts substituteParams fallback.
   */
  test('AGE PG-17 error does NOT appear after /graph load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    // Wait generously for the GraphQL concepts query to resolve
    await page.waitForTimeout(6_000);

    // CRITICAL: specific AGE error fragment must be absent from the page
    const ageErrorEl = page.getByText(AGE_PG17_ERROR, { exact: false });
    await expect(ageErrorEl).not.toBeVisible({
      timeout: 2_000,
    });

    // CRITICAL: Drizzle SET LOCAL parameterization error must not appear
    // (caused by sql`SET LOCAL ... = ${var}` template literal in withTenantContext)
    const setLocalErrorEl = page.getByText(SET_LOCAL_PARAM_ERROR, { exact: false });
    await expect(setLocalErrorEl).not.toBeVisible({ timeout: 2_000 });

    // Generic load-error banner must also be absent
    const loadErrorEl = page.getByText('Failed to load graph', { exact: false });
    await expect(loadErrorEl).not.toBeVisible();

    // Attach any captured console errors to the test output for debugging
    if (consoleErrors.length > 0) {
      console.warn('Console errors captured during test:', consoleErrors);
    }
  });

  test('SVG graph nodes render from real API data', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(6_000);

    // At least one SVG circle (graph node) must be rendered from real API data
    await expect(page.locator('svg circle').first()).toBeVisible({ timeout: 10_000 });
  });

  test('graph statistics show non-zero node count from real API', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(6_000);

    await expect(page.getByText('Graph Statistics')).toBeVisible({ timeout: 5_000 });

    // Node count must be a number > 0 (i.e., concepts loaded from DB)
    const nodeCountEl = page
      .locator('text=Nodes')
      .locator('..')
      .locator('p.text-lg');
    const countText = await nodeCountEl.textContent().catch(() => '0');
    const count = parseInt(countText ?? '0', 10);
    expect(count, 'Expected at least 1 concept from the real API').toBeGreaterThan(0);
  });

  test('visual snapshot — live backend graph render', async ({ page }) => {
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(6_000);

    const file = path.join(SCREENSHOTS_DIR, 'knowledge-graph-live-backend.png');
    await page.screenshot({ path: file, fullPage: true });
    expect(fs.existsSync(file), `Screenshot missing: ${file}`).toBe(true);
  });
});

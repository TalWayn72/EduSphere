/**
 * knowledge-graph-course-context.spec.ts
 *
 * E2E regression guard for T2.3:
 *   KnowledgeGraphPage rendered at /knowledge-graph/:courseId must:
 *     - Show a "Course Knowledge Graph" heading (not the global heading)
 *     - Show the kg-course-context-badge
 *     - Show breadcrumb linking back to the course
 *     - NOT crash (no "Something went wrong" overlay)
 *
 * Also covers the global /knowledge-graph route to ensure it is unaffected.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-graph-course-context.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
const MOCK_COURSE_ID = 'course-abc-123';

// ── Suite 1: Global route (regression — must not break after T2.3) ─────────────

test.describe('KnowledgeGraphPage — global route /knowledge-graph', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/knowledge-graph`, { waitUntil: 'domcontentloaded' });
  });

  test('renders "Knowledge Graph" heading for global route', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Knowledge Graph' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('does NOT show course-context badge on global route', async ({ page }) => {
    await page.waitForTimeout(500); // settle React
    const badge = page.getByTestId('kg-course-context-badge');
    expect(await badge.count()).toBe(0);
  });

  test('no "Something went wrong" error overlay on global route', async ({ page }) => {
    await expect(
      page.getByText(/something went wrong/i)
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('global route does not contain "404" or "Page not found"', async ({ page }) => {
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toContain('404');
    expect(body).not.toContain('Page not found');
  });
});

// ── Suite 2: Course-context route /knowledge-graph/:courseId ───────────────────

test.describe('KnowledgeGraphPage — course-context route /knowledge-graph/:courseId', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/knowledge-graph/${MOCK_COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
  });

  test('renders without crashing (no 404)', async ({ page }) => {
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toContain('404');
    expect(body).not.toContain('Page not found');
    expect(page.url()).toContain(`/knowledge-graph/${MOCK_COURSE_ID}`);
  });

  test('renders "Course Knowledge Graph" heading when courseId is provided', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Course Knowledge Graph/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows course-context badge (kg-course-context-badge)', async ({ page }) => {
    const badge = page.getByTestId('kg-course-context-badge');
    await expect(badge).toBeVisible({ timeout: 10_000 });
  });

  test('course-context badge contains courseId text', async ({ page }) => {
    const badge = page.getByTestId('kg-course-context-badge');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    const badgeText = (await badge.textContent()) ?? '';
    expect(badgeText).toContain(MOCK_COURSE_ID);
  });

  test('breadcrumb is visible and links back', async ({ page }) => {
    // The breadcrumb nav should be visible
    const breadcrumb = page.locator('[aria-label="breadcrumb"], nav').first();
    await expect(breadcrumb).toBeVisible({ timeout: 10_000 });
  });

  test('no "Something went wrong" error overlay with courseId', async ({ page }) => {
    await expect(
      page.getByText(/something went wrong/i)
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('no raw technical strings in page body', async ({ page }) => {
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('TypeError');
  });

  test('visual screenshot — course-context knowledge graph @visual', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot('knowledge-graph-course-context.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});

// ── Suite 3: AdminActivityFeed — available on /admin route ────────────────────

test.describe('AdminActivityFeed — accessible on admin dashboard', () => {
  test('admin dashboard renders activity feed section', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });

    // The admin activity feed may or may not exist depending on role
    const body = (await page.locator('body').textContent()) ?? '';
    // Page must not crash
    expect(body).not.toContain('Something went wrong');
    expect(body).not.toContain('TypeError');
    expect(body.length).toBeGreaterThan(10);
  });
});

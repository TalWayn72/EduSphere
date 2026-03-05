/**
 * Course Discovery — Phase 2 E2E tests
 *
 * Tests for CoursesDiscoveryPage rendered at /courses/discover.
 *
 * Phase 2 must wire the route before these tests can pass end-to-end.
 * Until the route exists, tests navigate to the page URL and verify the
 * component renders its mock-data shell correctly in DEV_MODE.
 *
 * Component data-testids used:
 *   - "course-discovery-page"  — root wrapper
 *   - "course-search-input"    — search <input>
 *   - "course-filter-bar"      — filter row (categories + level + duration)
 *   - "course-grid-toggle"     — button: switch to grid layout
 *   - "course-list-toggle"     — button: switch to list layout
 *   - "course-card"            — individual course card (multiple)
 *   - "courses-empty-state"    — shown when search yields no results
 *
 * Note: CoursesDiscoveryPage already uses data-testid="courses-empty-state".
 * The search input and filter bar testids must be added in Phase 2.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/course-discovery.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * Phase 2 will add /courses/discover to the router.
 * Until then, tests that navigate directly will render the 404 → redirect.
 * Mark the route constant here so it is easy to update.
 */
const DISCOVERY_ROUTE = '/courses/discover';

// ─── Suite 1: Page structure ──────────────────────────────────────────────────

test.describe('Course Discovery — page structure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${DISCOVERY_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
  });

  test('heading "Discover Courses" is visible', async ({ page }) => {
    // CoursesDiscoveryPage renders <h1>Discover Courses</h1>
    await expect(
      page.getByRole('heading', { name: /Discover Courses/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('search input is present', async ({ page }) => {
    // Phase 2 must attach data-testid="course-search-input" to the <Input>
    const searchInput = page
      .locator('[data-testid="course-search-input"]')
      .or(page.locator('input[placeholder*="Search"]').first());
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('filter bar is visible', async ({ page }) => {
    // Phase 2 must attach data-testid="course-filter-bar" to the filter row
    const filterBar = page
      .locator('[data-testid="course-filter-bar"]')
      .or(page.getByRole('button', { name: /All/i }).first());
    await expect(filterBar).toBeVisible({ timeout: 10_000 });
  });

  test('category filter buttons are rendered', async ({ page }) => {
    // CATEGORY_FILTERS: All, Programming, Design, Business, Science, Languages, Arts
    await expect(
      page.getByRole('button', { name: 'All' }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: 'Programming' }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 2: Course cards ────────────────────────────────────────────────────

test.describe('Course Discovery — course cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${DISCOVERY_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
  });

  test('at least one course card is rendered', async ({ page }) => {
    // CourseCard renders <h3> with the course title
    const cards = page.locator('h3').filter({ hasText: /./ });
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('course cards contain instructor name', async ({ page }) => {
    // Mock data includes 'Sarah Chen' as instructor for TypeScript course
    await expect(page.getByText(/Sarah Chen/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('course cards contain category label', async ({ page }) => {
    // Mock data includes 'Programming' category for several courses
    await expect(
      page.getByText('Programming').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 3: Interactivity ───────────────────────────────────────────────────

test.describe('Course Discovery — interactivity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${DISCOVERY_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
  });

  test('search input filters courses by title', async ({ page }) => {
    const searchInput = page
      .locator('[data-testid="course-search-input"]')
      .or(page.locator('input[placeholder*="Search"]').first());
    await searchInput.waitFor({ timeout: 10_000 });

    // Type a query that matches only one course category
    await searchInput.fill('TypeScript');

    // Wait for debounce (300ms) + React re-render
    await page.waitForTimeout(500);

    // The TypeScript Bootcamp course must remain visible
    await expect(
      page.getByText(/TypeScript Bootcamp/i)
    ).toBeVisible({ timeout: 5_000 });

    // A course from a completely different category should be hidden
    await expect(
      page.getByText(/Digital Photography/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('search with no matching results shows empty state', async ({
    page,
  }) => {
    const searchInput = page
      .locator('[data-testid="course-search-input"]')
      .or(page.locator('input[placeholder*="Search"]').first());
    await searchInput.waitFor({ timeout: 10_000 });

    await searchInput.fill('zzz_no_match_xyz_9999');
    await page.waitForTimeout(500); // debounce

    await expect(
      page.locator('[data-testid="courses-empty-state"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('grid/list view toggle buttons are present', async ({ page }) => {
    // Phase 2 must attach data-testid="course-grid-toggle" and "course-list-toggle"
    // to the LayoutGrid / List icon buttons
    const gridBtn = page
      .locator('[data-testid="course-grid-toggle"]')
      .or(page.locator('button').filter({ has: page.locator('.lucide-layout-grid') }));
    const listBtn = page
      .locator('[data-testid="course-list-toggle"]')
      .or(page.locator('button').filter({ has: page.locator('.lucide-list') }));

    await expect(gridBtn.first()).toBeVisible({ timeout: 10_000 });
    await expect(listBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking list toggle switches view mode', async ({ page }) => {
    const listBtn = page
      .locator('[data-testid="course-list-toggle"]')
      .or(page.locator('button').filter({ has: page.locator('.lucide-list') }));

    await listBtn.first().waitFor({ timeout: 10_000 });
    await listBtn.first().click();

    // In list mode the grid container should switch to a single-column layout.
    // Phase 2 must toggle a [data-view="list"] attribute or "list-mode" class.
    const container = page.locator('[data-view="list"]').or(
      page.locator('.list-mode')
    );
    await expect(container.first()).toBeVisible({ timeout: 3_000 });
  });

  test('no raw technical error strings visible', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Error:');
  });

  test('visual regression — course discovery grid view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('course-discovery-grid.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('visual regression — course discovery mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}${DISCOVERY_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('course-discovery-mobile.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

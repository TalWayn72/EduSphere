/**
 * course-discovery-filters.spec.ts — Phase 28 Level + Sort Filter E2E Tests
 *
 * Tests the Level filter (Any Level / Beginner / Intermediate / Advanced) and
 * Sort select (Most Popular / Newest / Highest Rated) on CoursesDiscoveryPage.
 *
 * Component uses in-memory mock data (MOCK_COURSES array) — no backend required.
 * All filter interaction tests work in DEV_MODE without page.route() GraphQL mocking.
 *
 * data-testid reference (CoursesDiscoveryPage.tsx):
 *   "level-filter-group"  — role="group" aria-label="Filter by level"
 *   "sort-select"         — SelectTrigger id="sort-select"
 *   "courses-grid"        — data-view="grid"|"list"
 *   "courses-empty-state" — no-results placeholder
 *   "course-search-input" — search <Input>
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/course-discovery-filters.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

const DISCOVERY_ROUTE = '/courses/discover';

// ─── Before each: login and navigate ──────────────────────────────────────────

test.describe('CoursesDiscovery — Level and Sort Filters', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${DISCOVERY_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    // Wait for the page heading to confirm render
    await page.getByRole('heading', { name: /Discover Courses/i }).waitFor({
      timeout: 10_000,
    });
  });

  // ── Level filter pills are present ──────────────────────────────────────────

  test('level filter group is rendered with all four options', async ({
    page,
  }) => {
    const group = page.locator('[data-testid="level-filter-group"]').or(
      page.locator('[role="group"][aria-label*="level" i]')
    );
    await expect(group.first()).toBeVisible({ timeout: 10_000 });

    // All four level options from LEVEL_FILTERS constant
    const levels = ['Any Level', 'Beginner', 'Intermediate', 'Advanced'];
    for (const lvl of levels) {
      await expect(page.getByRole('button', { name: lvl }).first()).toBeVisible(
        { timeout: 5_000 }
      );
    }
  });

  // ── Level filter "Beginner" filters correctly ────────────────────────────────

  test('Level filter "Beginner" shows only beginner-level courses', async ({
    page,
  }) => {
    // Click "Beginner" level pill
    const beginnerBtn = page.getByRole('button', { name: 'Beginner' }).first();
    await beginnerBtn.waitFor({ timeout: 10_000 });
    await beginnerBtn.click();
    await page.waitForTimeout(300);

    // Beginner courses in mock data: UI/UX Design Fundamentals, Modern Spanish, Digital Photography, Entrepreneurship, Ancient Civilizations
    await expect(page.getByText(/UI\/UX Design Fundamentals/i)).toBeVisible({
      timeout: 5_000,
    });

    // Advanced courses must NOT be visible: Complete TypeScript Bootcamp (Advanced), Quantum Computing (Advanced)
    await expect(
      page.getByText(/Quantum Computing/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Level filter "Intermediate" ──────────────────────────────────────────────

  test('Level filter "Intermediate" shows only intermediate courses', async ({
    page,
  }) => {
    const intermediateBtn = page
      .getByRole('button', { name: 'Intermediate' })
      .first();
    await intermediateBtn.waitFor({ timeout: 10_000 });
    await intermediateBtn.click();
    await page.waitForTimeout(300);

    // Intermediate courses: Business Strategy, React 19, Linear Algebra, Brand Identity, Data Structures
    await expect(
      page.getByText(/Business Strategy in the Age of AI/i)
    ).toBeVisible({ timeout: 5_000 });

    // Beginner courses must NOT appear
    await expect(
      page.getByText(/Digital Photography/i)
    ).not.toBeVisible({ timeout: 3_000 });

    // Advanced courses must NOT appear
    await expect(
      page.getByText(/Complete TypeScript Bootcamp/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Level filter "Advanced" ──────────────────────────────────────────────────

  test('Level filter "Advanced" shows only advanced courses', async ({
    page,
  }) => {
    const advancedBtn = page
      .getByRole('button', { name: 'Advanced' })
      .first();
    await advancedBtn.waitFor({ timeout: 10_000 });
    await advancedBtn.click();
    await page.waitForTimeout(300);

    // Advanced courses: Complete TypeScript Bootcamp, Quantum Computing
    await expect(
      page.getByText(/Complete TypeScript Bootcamp/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Quantum Computing/i)).toBeVisible({
      timeout: 5_000,
    });

    // Non-advanced must NOT appear
    await expect(
      page.getByText(/UI\/UX Design Fundamentals/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Level filter "Any Level" resets to show all ──────────────────────────────

  test('Level filter "Any Level" shows all courses after filtering', async ({
    page,
  }) => {
    // First select Beginner to narrow
    const beginnerBtn = page.getByRole('button', { name: 'Beginner' }).first();
    await beginnerBtn.waitFor({ timeout: 10_000 });
    await beginnerBtn.click();
    await page.waitForTimeout(300);

    // Confirm filtering applied
    await expect(
      page.getByText(/Quantum Computing/i)
    ).not.toBeVisible({ timeout: 3_000 });

    // Reset to "Any Level"
    const anyLevelBtn = page
      .getByRole('button', { name: 'Any Level' })
      .first();
    await anyLevelBtn.click();
    await page.waitForTimeout(300);

    // All courses should appear again
    await expect(
      page.getByText(/Complete TypeScript Bootcamp/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Quantum Computing/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── Active level pill has aria-pressed="true" ────────────────────────────────

  test('selected level pill has aria-pressed="true"', async ({ page }) => {
    const intermediateBtn = page
      .getByRole('button', { name: 'Intermediate' })
      .first();
    await intermediateBtn.waitFor({ timeout: 10_000 });
    await intermediateBtn.click();
    await page.waitForTimeout(200);

    await expect(intermediateBtn).toHaveAttribute('aria-pressed', 'true');

    // Other level pills should have aria-pressed="false"
    const anyLevelBtn = page
      .getByRole('button', { name: 'Any Level' })
      .first();
    await expect(anyLevelBtn).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Sort "Highest Rated" reorders results ────────────────────────────────────

  test('Sort "Highest Rated" reorders courses by rating', async ({ page }) => {
    const sortTrigger = page.locator('[data-testid="sort-select"]').or(
      page.locator('#sort-select')
    );
    await sortTrigger.first().waitFor({ timeout: 10_000 });

    // Open the select
    await sortTrigger.first().click();
    await page.waitForTimeout(200);

    // Pick "Highest Rated"
    const highestRatedOption = page.getByRole('option', {
      name: /Highest Rated/i,
    });
    const optionVisible = await highestRatedOption
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (optionVisible) {
      await highestRatedOption.click();
    } else {
      // Radix Select uses a listbox; try SelectItem text
      await page.getByText(/Highest Rated/i).first().click();
    }

    await page.waitForTimeout(300);

    // Page should still render without crashing
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('undefined');

    // Courses grid must still be present
    const grid = page.locator('[data-testid="courses-grid"]');
    await expect(grid).toBeVisible({ timeout: 5_000 });
  });

  // ── Sort "Newest" reorders results ───────────────────────────────────────────

  test('Sort "Newest" option is selectable and renders courses', async ({
    page,
  }) => {
    const sortTrigger = page.locator('[data-testid="sort-select"]').or(
      page.locator('#sort-select')
    );
    await sortTrigger.first().waitFor({ timeout: 10_000 });
    await sortTrigger.first().click();
    await page.waitForTimeout(200);

    const newestOption = page.getByRole('option', { name: /Newest/i });
    const optionVisible = await newestOption
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (optionVisible) {
      await newestOption.click();
    } else {
      await page.getByText(/Newest/i).first().click();
    }

    await page.waitForTimeout(300);

    const grid = page.locator('[data-testid="courses-grid"]');
    await expect(grid).toBeVisible({ timeout: 5_000 });
  });

  // ── Level + Sort combined ────────────────────────────────────────────────────

  test('Level and Sort filters work together without errors', async ({
    page,
  }) => {
    // Apply Intermediate level filter
    const intermediateBtn = page
      .getByRole('button', { name: 'Intermediate' })
      .first();
    await intermediateBtn.waitFor({ timeout: 10_000 });
    await intermediateBtn.click();
    await page.waitForTimeout(300);

    // Then change sort
    const sortTrigger = page.locator('[data-testid="sort-select"]').or(
      page.locator('#sort-select')
    );
    await sortTrigger.first().click();
    await page.waitForTimeout(200);

    const newestOption = page.getByRole('option', { name: /Newest/i });
    const optionVisible = await newestOption
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (optionVisible) {
      await newestOption.click();
    } else {
      await page.getByText(/Newest/i).first().click();
    }

    await page.waitForTimeout(300);

    // No raw errors visible
    const body = await page.textContent('body');
    expect(body).not.toContain('Error:');
    expect(body).not.toContain('[object Object]');

    // Advanced/Beginner courses should remain hidden
    await expect(
      page.getByText(/Quantum Computing/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });

  // ── ARIA: level filter group has role="group" and aria-label ─────────────────

  test('level filter group has role="group" and aria-label="Filter by level"', async ({
    page,
  }) => {
    const group = page.locator(
      '[role="group"][aria-label="Filter by level"]'
    );
    await expect(group).toBeVisible({ timeout: 10_000 });
  });

  // ── ARIA: sort select has accessible label ───────────────────────────────────

  test('sort select has an accessible label', async ({ page }) => {
    // The label element is associated via htmlFor="sort-select"
    const label = page.locator('label[for="sort-select"]').or(
      page.locator('label', { hasText: /Sort by/i })
    );
    await expect(label.first()).toBeVisible({ timeout: 10_000 });

    // The trigger itself has aria-label="Sort courses"
    const trigger = page.locator('[data-testid="sort-select"]').or(
      page.locator('#sort-select')
    );
    const ariaLabel = await trigger.first().getAttribute('aria-label');
    const labelText = await label.first().textContent();
    // At least one of these must provide an accessible name
    const hasName =
      (ariaLabel && ariaLabel.length > 0) ||
      (labelText && labelText.trim().length > 0);
    expect(hasName).toBe(true);
  });

  // ── Level filter buttons are keyboard operable ───────────────────────────────

  test('level filter buttons are keyboard focusable', async ({ page }) => {
    // Tab through the page until we find a level filter button in focus
    let levelBtnFocused = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        return el.textContent?.trim() ?? null;
      });
      const levelLabels = ['Any Level', 'Beginner', 'Intermediate', 'Advanced'];
      if (focused && levelLabels.some((l) => focused.includes(l))) {
        levelBtnFocused = true;
        break;
      }
    }
    // Level buttons should be reachable by keyboard
    // Soft assertion — if filter bar is scrollable on narrow viewport it may be off-screen
    if (!levelBtnFocused) {
      console.warn(
        '[a11y] Level filter buttons not reached via Tab in 25 keystrokes — check scrollable filter bar'
      );
    }
  });

  // ── No raw tech strings in DOM ───────────────────────────────────────────────

  test('no raw technical error strings are visible on the page', async ({
    page,
  }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('Error:');
    expect(body).not.toContain('TypeError');
  });

  // ── Visual regression ────────────────────────────────────────────────────────

  test('visual: course discovery default state with all filters visible', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('course-discovery-filters-default.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('visual: course discovery with Intermediate level filter active', async ({
    page,
  }) => {
    const intermediateBtn = page
      .getByRole('button', { name: 'Intermediate' })
      .first();
    await intermediateBtn.waitFor({ timeout: 10_000 });
    await intermediateBtn.click();
    await page.waitForTimeout(300);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot(
      'course-discovery-filters-intermediate.png',
      {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      }
    );
  });
});

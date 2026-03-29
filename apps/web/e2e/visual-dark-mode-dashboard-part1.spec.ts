/**
 * Visual Regression — Dark Mode Dashboard Pages (Part 1)
 *
 * Dashboard, Courses, Search in dark mode.
 * Split from visual-dark-mode-dashboard.spec.ts (Part 1 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-dashboard-part1.spec.ts-snapshots/
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goToDark(page: Page, path: string) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

const ELEMENT_OPTS = { animations: 'disabled' as const };

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Dashboard @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('dashboard — full page dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    await expect(page).toHaveScreenshot('dark-dashboard-dashboard-full.png', STABLE_OPTS);
  });

  test('dashboard — header dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-dashboard-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-header.png', ELEMENT_OPTS);
    }
  });

  test('dashboard — sidebar dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const sidebar = page.locator('aside').or(page.locator('nav')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-dashboard-dashboard-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-sidebar.png', ELEMENT_OPTS);
    }
  });

  test('dashboard — main content dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-dashboard-dashboard-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-main.png', ELEMENT_OPTS);
    }
  });

  test('dashboard — stats widgets dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const stats = page.locator('.card').or(page.locator('main')).first();
    if (await stats.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(stats).toHaveScreenshot('dark-dashboard-dashboard-stats.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-stats.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Courses @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('courses — full page dark', async ({ page }) => {
    await goToDark(page, '/courses');
    await expect(page).toHaveScreenshot('dark-dashboard-courses-full.png', STABLE_OPTS);
  });

  test('courses — header dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-courses-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-header.png', ELEMENT_OPTS);
    }
  });

  test('courses — course grid dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const grid = page.locator('main').first();
    if (await grid.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(grid).toHaveScreenshot('dark-dashboard-courses-grid.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-grid.png', ELEMENT_OPTS);
    }
  });

  test('courses — filter controls dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const filters = page.locator('[role="search"]').or(page.locator('main')).first();
    if (await filters.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(filters).toHaveScreenshot('dark-dashboard-courses-filters.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-filters.png', ELEMENT_OPTS);
    }
  });

  test('courses — pagination dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const pagination = page.locator('nav[aria-label="pagination"]').or(page.locator('.pagination')).first();
    if (await pagination.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(pagination).toHaveScreenshot('dark-dashboard-courses-pagination.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-pagination.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Search @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('search — full page dark', async ({ page }) => {
    await goToDark(page, '/search');
    await expect(page).toHaveScreenshot('dark-dashboard-search-full.png', STABLE_OPTS);
  });

  test('search — header dark', async ({ page }) => {
    await goToDark(page, '/search');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-search-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-header.png', ELEMENT_OPTS);
    }
  });

  test('search — search input dark', async ({ page }) => {
    await goToDark(page, '/search');
    const input = page.locator('input[type="search"]').or(page.locator('input')).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(input).toHaveScreenshot('dark-dashboard-search-input.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-input.png', ELEMENT_OPTS);
    }
  });

  test('search — results area dark', async ({ page }) => {
    await goToDark(page, '/search');
    const results = page.locator('main').first();
    if (await results.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(results).toHaveScreenshot('dark-dashboard-search-results.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-results.png', ELEMENT_OPTS);
    }
  });

  test('search — sidebar filters dark', async ({ page }) => {
    await goToDark(page, '/search');
    const sidebar = page.locator('aside').or(page.locator('.sidebar')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-dashboard-search-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-sidebar.png', ELEMENT_OPTS);
    }
  });
});

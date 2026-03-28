/**
 * Visual Regression Tests — Exam Pages
 *
 * Covers exam list, item bank, blueprint, results, and security pages.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-exams --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM LIST
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam List @visual-exams', () => {
  test.setTimeout(30_000);

  test('exam list — full page', async ({ page }) => {
    await goTo(page, '/exams');
    await expect(page).toHaveScreenshot('exams-list-full.png', STABLE_OPTS);
  });

  test('exam list — header section', async ({ page }) => {
    await goTo(page, '/exams');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('exams-list-header.png', { animations: 'disabled' as const });
  });

  test('exam list — main content', async ({ page }) => {
    await goTo(page, '/exams');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('exams-list-main.png', { animations: 'disabled' as const });
  });

  test('exam list — exam cards grid', async ({ page }) => {
    await goTo(page, '/exams');
    const grid = page.locator('[data-testid="exam-grid"], .grid, [role="list"]').first();
    await expect(grid).toHaveScreenshot('exams-list-grid.png', { animations: 'disabled' as const });
  });

  test('exam list — filter controls', async ({ page }) => {
    await goTo(page, '/exams');
    const filters = page.locator('[data-testid="filters"], [role="search"], .filters').first();
    await expect(filters).toHaveScreenshot('exams-list-filters.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ITEM BANK
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Item Bank @visual-exams', () => {
  test.setTimeout(30_000);

  test('item bank — full page', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    await expect(page).toHaveScreenshot('exams-itembank-full.png', STABLE_OPTS);
  });

  test('item bank — header section', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('exams-itembank-header.png', { animations: 'disabled' as const });
  });

  test('item bank — question list', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    const list = page.locator('[data-testid="item-list"], table, [role="table"], main').first();
    await expect(list).toHaveScreenshot('exams-itembank-list.png', { animations: 'disabled' as const });
  });

  test('item bank — sidebar categories', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    const sidebar = page.locator('aside, [data-testid="categories"], nav').first();
    await expect(sidebar).toHaveScreenshot('exams-itembank-categories.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLUEPRINT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam Blueprint @visual-exams', () => {
  test.setTimeout(30_000);

  test('blueprint — full page', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    await expect(page).toHaveScreenshot('exams-blueprint-full.png', STABLE_OPTS);
  });

  test('blueprint — header section', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('exams-blueprint-header.png', { animations: 'disabled' as const });
  });

  test('blueprint — main content', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('exams-blueprint-main.png', { animations: 'disabled' as const });
  });

  test('blueprint — topic distribution', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    const dist = page.locator('[data-testid="topic-distribution"], .distribution, table').first();
    await expect(dist).toHaveScreenshot('exams-blueprint-distribution.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam Results @visual-exams', () => {
  test.setTimeout(30_000);

  test('results — full page', async ({ page }) => {
    await goTo(page, '/exams/results');
    await expect(page).toHaveScreenshot('exams-results-full.png', STABLE_OPTS);
  });

  test('results — header section', async ({ page }) => {
    await goTo(page, '/exams/results');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('exams-results-header.png', { animations: 'disabled' as const });
  });

  test('results — summary statistics', async ({ page }) => {
    await goTo(page, '/exams/results');
    const stats = page.locator('[data-testid="results-summary"], .summary, main').first();
    await expect(stats).toHaveScreenshot('exams-results-summary.png', { animations: 'disabled' as const });
  });

  test('results — score table', async ({ page }) => {
    await goTo(page, '/exams/results');
    const table = page.locator('table, [data-testid="score-table"], [role="table"]').first();
    await expect(table).toHaveScreenshot('exams-results-table.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam Security @visual-exams', () => {
  test.setTimeout(30_000);

  test('security settings — full page', async ({ page }) => {
    await goTo(page, '/exams/security');
    await expect(page).toHaveScreenshot('exams-security-full.png', STABLE_OPTS);
  });

  test('security settings — header section', async ({ page }) => {
    await goTo(page, '/exams/security');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('exams-security-header.png', { animations: 'disabled' as const });
  });

  test('security settings — configuration options', async ({ page }) => {
    await goTo(page, '/exams/security');
    const config = page.locator('form, [data-testid="security-config"], main').first();
    await expect(config).toHaveScreenshot('exams-security-config.png', { animations: 'disabled' as const });
  });

  test('security settings — proctoring section', async ({ page }) => {
    await goTo(page, '/exams/security');
    const proctoring = page.locator('[data-testid="proctoring"], .proctoring-section, section').first();
    await expect(proctoring).toHaveScreenshot('exams-security-proctoring.png', { animations: 'disabled' as const });
  });

  test('exam list — sidebar navigation', async ({ page }) => {
    await goTo(page, '/exams');
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
    await expect(sidebar).toHaveScreenshot('exams-list-sidebar.png', { animations: 'disabled' as const });
  });

  test('item bank — action toolbar', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    const toolbar = page.locator('[data-testid="toolbar"], [role="toolbar"], .toolbar').first();
    await expect(toolbar).toHaveScreenshot('exams-itembank-toolbar.png', { animations: 'disabled' as const });
  });

  test('blueprint — action buttons', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    const actions = page.locator('[data-testid="blueprint-actions"], button, .actions').first();
    await expect(actions).toHaveScreenshot('exams-blueprint-actions.png', { animations: 'disabled' as const });
  });

  test('security settings — lockdown options', async ({ page }) => {
    await goTo(page, '/exams/security');
    const lockdown = page.locator('[data-testid="lockdown-options"], .lockdown, form').first();
    await expect(lockdown).toHaveScreenshot('exams-security-lockdown.png', { animations: 'disabled' as const });
  });
});

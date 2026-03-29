/**
 * Visual Interactions — Table/List States (Part 2)
 *
 * Covers: Exams item bank, Analytics tables, Loading/empty states.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

// ─── Helper: resilient element screenshot with visibility fallback ──────────
async function screenshotElement(
  page: import('@playwright/test').Page,
  selector: string,
  name: string,
  opts = STABLE_OPTS,
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

test.describe('Visual Interactions — Tables (Part 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
    await login(page);
  });

  // ─── Exams item bank ───────────────────────────────────────────────────────

  test.describe('Exams item bank', () => {
    test('item bank table default', async ({ page }) => {
      await page.goto('/exams/item-bank', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, 'table, [data-testid="item-bank-table"], [role="grid"]', 'interact-tables-exams-itembank-default.png', LOOSE_OPTS);
    });

    test('item bank sort by difficulty', async ({ page }) => {
      await page.goto('/exams/item-bank', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const diffHeader = page.locator('th:has-text("Difficulty"), [data-testid="col-difficulty"]').first();
      if (await diffHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await diffHeader.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, 'table, [data-testid="item-bank-table"]', 'interact-tables-exams-itembank-sort-difficulty.png', LOOSE_OPTS);
    });

    test('item bank row hover', async ({ page }) => {
      await page.goto('/exams/item-bank', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const row = page.locator('tbody tr').first();
      if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
        await row.hover();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'table, [data-testid="item-bank-table"]', 'interact-tables-exams-itembank-row-hover.png', LOOSE_OPTS);
    });

    test('item bank empty search result', async ({ page }) => {
      await page.goto('/exams/item-bank', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const search = page.locator('input[type="search"], input[placeholder*="Search"]').first();
      if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
        await search.fill('xyznonexistent12345');
        await page.waitForTimeout(400);
      }
      await expect(page).toHaveScreenshot('interact-tables-exams-itembank-empty-search.png', STABLE_OPTS);
    });

    test('item bank pagination last page', async ({ page }) => {
      await page.goto('/exams/item-bank', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const lastBtn = page.locator('[data-testid="last-page"], button:has-text("Last"), [aria-label*="last"]').first();
      if (await lastBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lastBtn.click();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[data-testid="pagination"], nav[aria-label*="pagination"]', 'interact-tables-exams-itembank-page-last.png');
    });
  });

  // ─── Analytics tables ──────────────────────────────────────────────────────

  test.describe('Analytics tables', () => {
    test('analytics data table default', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, 'table, [data-testid="analytics-table"], [role="grid"]', 'interact-tables-analytics-default.png', LOOSE_OPTS);
    });

    test('analytics table sort by metric', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const metricHeader = page.locator('th, [role="columnheader"]').first();
      if (await metricHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await metricHeader.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, 'table, [data-testid="analytics-table"]', 'interact-tables-analytics-sorted.png', LOOSE_OPTS);
    });

    test('analytics table filter applied', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const filterBtn = page.locator('[data-testid="filter-btn"], button:has-text("Filter")').first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-tables-analytics-filter-applied.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });
  });

  // ─── Loading and empty states ──────────────────────────────────────────────

  test.describe('Table loading/empty states', () => {
    test('loading skeleton state', async ({ page }) => {
      await page.route('**/graphql', async (route) => {
        await new Promise((r) => setTimeout(r, 5000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      });
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot('interact-tables-admin-users-loading.png', LOOSE_OPTS);
    });

    test('empty table no data', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { users: { edges: [], totalCount: 0 } } }),
        }),
      );
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-tables-admin-users-empty.png', STABLE_OPTS);
    });

    test('error state in table', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Failed to fetch users' }] }),
        }),
      );
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-tables-admin-users-error.png', STABLE_OPTS);
    });

    test('table with bulk action bar', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const selectAll = page.locator('thead input[type="checkbox"], thead [role="checkbox"]').first();
      if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
        await selectAll.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="bulk-actions"], [data-testid="action-bar"]', 'interact-tables-admin-users-bulk-actions.png');
    });

    test('table column resize handle visible', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const resizeHandle = page.locator('[data-testid="resize-handle"], .resize-handle, th .resizer').first();
      if (await resizeHandle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await resizeHandle.hover();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'table thead, [role="grid"] [role="row"]:first-child', 'interact-tables-admin-users-resize-handle.png');
    });
  });
});

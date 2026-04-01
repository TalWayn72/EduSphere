/**
 * Visual Interactions — Table/List States (Part 1)
 *
 * Covers: Admin users table and Courses table/list states.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import {
  STABLE_OPTS,
  LOOSE_OPTS,
  dynamicMasks,
} from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

// ─── Helper: resilient element screenshot with visibility fallback ──────────
async function screenshotElement(
  page: import('@playwright/test').Page,
  selector: string,
  name: string,
  opts = STABLE_OPTS
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

test.describe('Visual Interactions — Tables (Part 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      })
    );
    await login(page);
  });

  // ─── Admin users table ─────────────────────────────────────────────────────

  test.describe('Admin users table', () => {
    test('default table state', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-default.png',
        LOOSE_OPTS
      );
    });

    test('sort by name ascending', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const nameHeader = page
        .locator(
          'th:has-text("Name"), [data-testid="col-name"], [role="columnheader"]:has-text("Name")'
        )
        .first();
      if (await nameHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameHeader.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-sort-name-asc.png',
        LOOSE_OPTS
      );
    });

    test('sort by name descending', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const nameHeader = page
        .locator('th:has-text("Name"), [data-testid="col-name"]')
        .first();
      if (await nameHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameHeader.click();
        await page.waitForTimeout(200);
        await nameHeader.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-sort-name-desc.png',
        LOOSE_OPTS
      );
    });

    test('sort by role', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const roleHeader = page
        .locator('th:has-text("Role"), [data-testid="col-role"]')
        .first();
      if (await roleHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleHeader.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-sort-role.png',
        LOOSE_OPTS
      );
    });

    test('filter panel open', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const filterBtn = page
        .locator(
          '[data-testid="filter-btn"], button:has-text("Filter"), [aria-label*="filter"]'
        )
        .first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        '[data-testid="filter-panel"], [data-state="open"], [role="dialog"]',
        'interact-tables-admin-users-filter-open.png'
      );
    });

    test('selected row highlight', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const row = page.locator('tbody tr, [data-testid="user-row"]').first();
      if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
        await row.click();
        await page.waitForTimeout(200);
      }
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-row-selected.png',
        LOOSE_OPTS
      );
    });

    test('multiple rows selected via checkbox', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const checkboxes = page.locator(
        'tbody input[type="checkbox"], tbody [role="checkbox"]'
      );
      const count = await checkboxes.count();
      for (let i = 0; i < Math.min(3, count); i++) {
        await checkboxes.nth(i).click();
        await page.waitForTimeout(100);
      }
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-multi-select.png',
        LOOSE_OPTS
      );
    });

    test('pagination first page', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(
        page,
        '[data-testid="pagination"], nav[aria-label*="pagination"]',
        'interact-tables-admin-users-page-first.png'
      );
    });

    test('pagination second page', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const nextBtn = page
        .locator(
          '[data-testid="next-page"], button:has-text("Next"), [aria-label*="next"]'
        )
        .first();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }
      await screenshotElement(
        page,
        '[data-testid="pagination"], nav[aria-label*="pagination"]',
        'interact-tables-admin-users-page-second.png'
      );
    });

    test('expanded row details', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const expandBtn = page
        .locator(
          '[data-testid="expand-row"], button[aria-label*="expand"], tr button:has(svg)'
        )
        .first();
      if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        'table, [data-testid="users-table"], [role="grid"]',
        'interact-tables-admin-users-expanded-row.png',
        LOOSE_OPTS
      );
    });
  });

  // ─── Courses table/list ────────────────────────────────────────────────────

  test.describe('Courses table', () => {
    test('courses list default', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'interact-tables-courses-default.png',
        { ...LOOSE_OPTS, mask: dynamicMasks(page) }
      );
    });

    test('courses sorted by date', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const dateHeader = page
        .locator(
          'th:has-text("Date"), th:has-text("Created"), [data-testid="col-date"]'
        )
        .first();
      if (await dateHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dateHeader.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(
        'interact-tables-courses-sort-date.png',
        { ...LOOSE_OPTS, mask: dynamicMasks(page) }
      );
    });

    test('courses grid view', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const gridBtn = page
        .locator(
          '[data-testid="grid-view"], button[aria-label*="grid"], [aria-label*="Grid"]'
        )
        .first();
      if (await gridBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gridBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(
        'interact-tables-courses-grid-view.png',
        { ...LOOSE_OPTS, mask: dynamicMasks(page) }
      );
    });

    test('courses list view', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const listBtn = page
        .locator(
          '[data-testid="list-view"], button[aria-label*="list"], [aria-label*="List"]'
        )
        .first();
      if (await listBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await listBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(
        'interact-tables-courses-list-view.png',
        { ...LOOSE_OPTS, mask: dynamicMasks(page) }
      );
    });

    test('courses search filtered', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const search = page
        .locator(
          'input[type="search"], [data-testid="search-courses"], input[placeholder*="Search"]'
        )
        .first();
      if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
        await search.fill('Introduction');
        await page.waitForTimeout(400);
      }
      await expect(page).toHaveScreenshot(
        'interact-tables-courses-search-filtered.png',
        { ...LOOSE_OPTS, mask: dynamicMasks(page) }
      );
    });
  });
});

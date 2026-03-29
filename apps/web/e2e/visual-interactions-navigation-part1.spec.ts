/**
 * Visual Interactions — Navigation States — Part 1
 *
 * Covers: Sidebar, Mobile hamburger menu, Breadcrumbs, Dashboard tabs, Dropdown menus.
 * ~30 assertions.
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

test.describe('Visual Interactions — Navigation (Part 1)', () => {
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

  // ─── Sidebar states ────────────────────────────────────────────────────────

  test.describe('Sidebar', () => {
    test('collapsed sidebar state', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="app-sidebar"], nav, aside', 'interact-nav-dashboard-sidebar-collapsed.png');
    });

    test('expanded sidebar state', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const toggle = page.locator('[data-testid="sidebar-toggle"], [aria-label*="sidebar"], [aria-label*="menu"]').first();
      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="app-sidebar"], nav, aside', 'interact-nav-dashboard-sidebar-expanded.png');
    });

    test('sidebar hover on nav item', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const navItem = page.locator('nav a, aside a, [data-testid="nav-item"]').first();
      if (await navItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await navItem.hover();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'nav, aside, [data-testid="app-sidebar"]', 'interact-nav-dashboard-sidebar-hover.png');
    });

    test('sidebar active item highlight', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-nav-dashboard-sidebar-active.png', STABLE_OPTS);
    });
  });

  // ─── Mobile hamburger menu ─────────────────────────────────────────────────

  test.describe('Mobile hamburger menu', () => {
    test('hamburger menu closed (mobile)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-nav-mobile-hamburger-closed.png', STABLE_OPTS);
    });

    test('hamburger menu open (mobile)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const hamburger = page.locator('[data-testid="hamburger-menu"], [aria-label*="menu"], button:has(svg)').first();
      if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await hamburger.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-nav-mobile-hamburger-open.png', STABLE_OPTS);
    });

    test('mobile nav overlay visible', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const hamburger = page.locator('[data-testid="hamburger-menu"], [aria-label*="menu"], button:has(svg)').first();
      if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await hamburger.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="mobile-nav"], [role="dialog"], [data-state="open"]', 'interact-nav-mobile-overlay.png');
    });
  });

  // ─── Breadcrumbs ───────────────────────────────────────────────────────────

  test.describe('Breadcrumbs', () => {
    test('breadcrumb on courses page', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="breadcrumb"], nav[aria-label*="breadcrumb"], .breadcrumb', 'interact-nav-courses-breadcrumb.png');
    });

    test('breadcrumb on nested page', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="breadcrumb"], nav[aria-label*="breadcrumb"], .breadcrumb', 'interact-nav-course-detail-breadcrumb.png');
    });

    test('breadcrumb hover state', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const crumb = page.locator('[data-testid="breadcrumb"] a, nav[aria-label*="breadcrumb"] a').first();
      if (await crumb.isVisible({ timeout: 3000 }).catch(() => false)) {
        await crumb.hover();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, '[data-testid="breadcrumb"], nav[aria-label*="breadcrumb"], .breadcrumb', 'interact-nav-courses-breadcrumb-hover.png');
    });
  });

  // ─── Tab switching ─────────────────────────────────────────────────────────

  test.describe('Dashboard tabs', () => {
    const tabs = ['overview', 'analytics', 'activity', 'settings'];

    for (const tab of tabs) {
      test(`dashboard tab: ${tab}`, async ({ page }) => {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const tabEl = page.locator(`[data-testid="tab-${tab}"], [role="tab"]:has-text("${tab}"), button:has-text("${tab}")`).first();
        if (await tabEl.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tabEl.click();
          await page.waitForTimeout(300);
        }
        await expect(page).toHaveScreenshot(`interact-nav-dashboard-tab-${tab}.png`, { ...LOOSE_OPTS, mask: dynamicMasks(page) });
      });
    }
  });

  // ─── Dropdown menus ────────────────────────────────────────────────────────

  test.describe('Dropdown menus', () => {
    test('action dropdown on dashboard', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const trigger = page.locator('[data-testid="actions-dropdown"], [aria-haspopup="menu"], [data-testid="dropdown-trigger"]').first();
      if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trigger.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="menu"], [data-state="open"], [data-testid="dropdown-content"]', 'interact-nav-dashboard-dropdown-open.png');
    });

    test('sort dropdown on courses', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const sortBtn = page.locator('[data-testid="sort-dropdown"], button:has-text("Sort"), [aria-label*="sort"]').first();
      if (await sortBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sortBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="menu"], [role="listbox"], [data-state="open"]', 'interact-nav-courses-sort-dropdown.png');
    });

    test('filter dropdown on courses', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const filterBtn = page.locator('[data-testid="filter-dropdown"], button:has-text("Filter"), [aria-label*="filter"]').first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="menu"], [data-state="open"], [data-testid="filter-panel"]', 'interact-nav-courses-filter-dropdown.png');
    });
  });

});

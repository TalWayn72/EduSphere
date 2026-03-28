/**
 * visual-rtl-authenticated.spec.ts --- RTL Layout Visual Regression for Authenticated Pages
 *
 * Screenshot-based visual regression for authenticated pages rendered in RTL (Hebrew) mode.
 * Validates sidebar, topbar, content areas, and navigation elements mirror correctly in RTL.
 *
 * Snapshots stored in: apps/web/e2e/visual-rtl-authenticated.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-authenticated --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-authenticated.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.use({ locale: 'he' });

test.describe('Visual RTL -- Authenticated Pages @visual @rtl', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
    await login(page);
  });

  // --- Dashboard ---

  test('dashboard -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-auth-dashboard-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('dashboard -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-auth-dashboard-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-dashboard-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('dashboard -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-auth-dashboard-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-dashboard-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  test('dashboard -- main content RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-auth-dashboard-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-dashboard-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard -- widget cards RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const cards = page.locator('[data-testid="dashboard-widgets"]').or(page.locator('main section')).first();
    if (await cards.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cards).toHaveScreenshot('rtl-auth-dashboard-widgets.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-dashboard-widgets.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  // --- Courses ---

  test('courses -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-auth-courses-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('courses -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-auth-courses-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-courses-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('courses -- course grid RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-auth-courses-grid.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-courses-grid.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('courses -- search bar RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const search = page.locator('input[type="search"]').or(page.locator('[data-testid="search-input"]')).first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(search).toHaveScreenshot('rtl-auth-courses-search.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-courses-search.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Search ---

  test('search -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-auth-search-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('search -- search input RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const searchArea = page.locator('main').first();
    if (await searchArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(searchArea).toHaveScreenshot('rtl-auth-search-input.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-search-input.png', {
        animations: 'disabled',
      });
    }
  });

  test('search -- results area RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const results = page.locator('[data-testid="search-results"]').or(page.locator('main section')).first();
    if (await results.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(results).toHaveScreenshot('rtl-auth-search-results.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-search-results.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  // --- Profile ---

  test('profile -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-auth-profile-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('profile -- user info RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-auth-profile-info.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-profile-info.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-auth-profile-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-profile-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Notifications ---

  test('notifications -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-auth-notifications-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('notifications -- list RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-auth-notifications-list.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-notifications-list.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('notifications -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-auth-notifications-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-notifications-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Cross-page RTL consistency ---

  test('all auth pages -- consistent RTL sidebar', async ({ page }) => {
    const pages = ['/dashboard', '/courses', '/search', '/profile', '/notifications'];
    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
      const slug = path.replace('/', '');
      if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(sidebar).toHaveScreenshot(`rtl-auth-consistency-sidebar-${slug}.png`, {
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot(`rtl-auth-consistency-sidebar-${slug}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

  test('all auth pages -- consistent RTL topbar', async ({ page }) => {
    const pages = ['/dashboard', '/courses', '/search', '/profile', '/notifications'];
    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
      const slug = path.replace('/', '');
      if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(topbar).toHaveScreenshot(`rtl-auth-consistency-topbar-${slug}.png`, {
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot(`rtl-auth-consistency-topbar-${slug}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

  // --- Additional section-level RTL checks ---

  test('dashboard -- action buttons RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('rtl-auth-dashboard-actions.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-dashboard-actions.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('courses -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-auth-courses-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-courses-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  test('search -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-auth-search-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-search-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('notifications -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-auth-notifications-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-notifications-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('profile -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-auth-profile-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-auth-profile-topbar.png', {
        animations: 'disabled',
      });
    }
  });
});

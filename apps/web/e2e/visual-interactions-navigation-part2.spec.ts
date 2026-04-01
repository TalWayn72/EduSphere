/**
 * Visual Interactions — Navigation States — Part 2
 *
 * Covers: Search bar, User menu, Notification panel, Language selector,
 *         Cross-page nav states, Keyboard focus ring.
 * ~25 assertions.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

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

test.describe('Visual Interactions — Navigation (Part 2)', () => {
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

  // ─── Search bar ────────────────────────────────────────────────────────────

  test.describe('Search bar', () => {
    test('search unfocused', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(
        page,
        '[data-testid="search-bar"], input[type="search"], [role="search"]',
        'interact-nav-dashboard-search-unfocused.png'
      );
    });

    test('search focused', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const search = page
        .locator(
          '[data-testid="search-bar"] input, input[type="search"], [role="search"] input'
        )
        .first();
      if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
        await search.focus();
        await page.waitForTimeout(200);
      }
      await screenshotElement(
        page,
        '[data-testid="search-bar"], input[type="search"], [role="search"]',
        'interact-nav-dashboard-search-focused.png'
      );
    });

    test('search with text entered', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const search = page
        .locator(
          '[data-testid="search-bar"] input, input[type="search"], [role="search"] input'
        )
        .first();
      if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
        await search.fill('Introduction to');
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        '[data-testid="search-bar"], [role="search"], [data-testid="search-results"]',
        'interact-nav-dashboard-search-with-text.png'
      );
    });

    test('search results dropdown', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const search = page
        .locator(
          '[data-testid="search-bar"] input, input[type="search"], [role="search"] input'
        )
        .first();
      if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
        await search.fill('course');
        await page.waitForTimeout(500);
      }
      await screenshotElement(
        page,
        '[data-testid="search-results"], [role="listbox"], [data-state="open"]',
        'interact-nav-dashboard-search-results.png'
      );
    });
  });

  // ─── User menu ─────────────────────────────────────────────────────────────

  test.describe('User menu', () => {
    test('user menu closed', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(
        page,
        '[data-testid="user-menu"], [data-testid="user-avatar"]',
        'interact-nav-dashboard-user-menu-closed.png'
      );
    });

    test('user menu open', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const avatar = page
        .locator(
          '[data-testid="user-menu"], [data-testid="user-avatar"], [aria-label*="user"], [aria-label*="profile"]'
        )
        .first();
      if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await avatar.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        '[role="menu"], [data-state="open"], [data-testid="user-dropdown"]',
        'interact-nav-dashboard-user-menu-open.png'
      );
    });

    test('user menu hover on item', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const avatar = page
        .locator(
          '[data-testid="user-menu"], [data-testid="user-avatar"], [aria-label*="user"]'
        )
        .first();
      if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await avatar.click();
        await page.waitForTimeout(300);
        const menuItem = page.locator('[role="menuitem"]').first();
        if (await menuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          await menuItem.hover();
          await page.waitForTimeout(200);
        }
      }
      await screenshotElement(
        page,
        '[role="menu"], [data-state="open"]',
        'interact-nav-dashboard-user-menu-hover.png'
      );
    });
  });

  // ─── Notification panel ────────────────────────────────────────────────────

  test.describe('Notification panel', () => {
    test('notification bell icon', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(
        page,
        '[data-testid="notification-bell"], [aria-label*="notification"]',
        'interact-nav-dashboard-notification-bell.png'
      );
    });

    test('notification panel open', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const bell = page
        .locator(
          '[data-testid="notification-bell"], [aria-label*="notification"], button:has(svg)'
        )
        .nth(1);
      if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bell.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        '[data-testid="notification-panel"], [role="dialog"], [data-state="open"]',
        'interact-nav-dashboard-notification-panel.png'
      );
    });

    test('notification panel empty state', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const bell = page
        .locator(
          '[data-testid="notification-bell"], [aria-label*="notification"]'
        )
        .first();
      if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bell.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(
        'interact-nav-dashboard-notification-empty.png',
        LOOSE_OPTS
      );
    });
  });

  // ─── Language selector ─────────────────────────────────────────────────────

  test.describe('Language selector', () => {
    test('language selector closed', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(
        page,
        '[data-testid="language-selector"], [data-testid="locale-switcher"]',
        'interact-nav-dashboard-lang-closed.png'
      );
    });

    test('language selector open', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const langBtn = page
        .locator(
          '[data-testid="language-selector"], [data-testid="locale-switcher"], [aria-label*="language"]'
        )
        .first();
      if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(
        page,
        '[role="menu"], [role="listbox"], [data-state="open"]',
        'interact-nav-dashboard-lang-open.png'
      );
    });

    test('language option hover', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const langBtn = page
        .locator(
          '[data-testid="language-selector"], [data-testid="locale-switcher"]'
        )
        .first();
      if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langBtn.click();
        await page.waitForTimeout(300);
        const option = page
          .locator('[role="menuitem"], [role="option"]')
          .first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.hover();
          await page.waitForTimeout(200);
        }
      }
      await screenshotElement(
        page,
        '[role="menu"], [role="listbox"], [data-state="open"]',
        'interact-nav-dashboard-lang-hover.png'
      );
    });
  });

  // ─── Cross-page navigation visual states ───────────────────────────────────

  test.describe('Cross-page nav states', () => {
    const pages = [
      { path: '/courses', name: 'courses' },
      { path: '/dashboard', name: 'dashboard' },
      { path: '/profile', name: 'profile' },
      { path: '/settings', name: 'settings' },
      { path: '/notifications', name: 'notifications' },
      { path: '/achievements', name: 'achievements' },
      { path: '/analytics', name: 'analytics' },
      { path: '/social', name: 'social' },
    ];

    for (const pg of pages) {
      test(`navigation bar on ${pg.name}`, async ({ page }) => {
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await screenshotElement(
          page,
          'header, nav, [data-testid="top-nav"], [data-testid="app-header"]',
          `interact-nav-${pg.name}-header.png`
        );
      });
    }
  });

  // ─── Keyboard navigation focus ring ────────────────────────────────────────

  test.describe('Keyboard focus ring', () => {
    test('tab focus on first nav item', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot(
        'interact-nav-dashboard-tab-focus-first.png',
        STABLE_OPTS
      );
    });

    test('tab focus on second nav item', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot(
        'interact-nav-dashboard-tab-focus-second.png',
        STABLE_OPTS
      );
    });

    test('tab focus on skip-to-content', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      await screenshotElement(
        page,
        '[data-testid="skip-link"], a[href="#main-content"]',
        'interact-nav-dashboard-skip-link.png'
      );
    });
  });
});

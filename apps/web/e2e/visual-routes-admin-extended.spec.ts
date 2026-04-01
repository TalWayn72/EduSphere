/**
 * Visual E2E — Admin Extended Routes
 *
 * Covers 10 admin sub-routes with ~50 toHaveScreenshot() assertions.
 * Each route: full page + header + main content + sidebar + action area.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

const ADMIN_ROUTES = [
  'users',
  'roles',
  'tenants',
  'audit-log',
  'api-keys',
  'webhooks',
  'email-templates',
  'branding',
  'feature-flags',
  'billing',
] as const;

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function screenshotWithFallback(
  page: import('@playwright/test').Page,
  selector: string,
  altSelector: string,
  name: string
) {
  const el = page.locator(selector).or(page.locator(altSelector)).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, STABLE_OPTS);
  } else {
    await expect(page).toHaveScreenshot(name, STABLE_OPTS);
  }
}

for (const route of ADMIN_ROUTES) {
  test.describe(`/admin/${route}`, () => {
    test(`full page screenshot`, async ({ page }) => {
      await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        `routes-admin-${route}-full.png`,
        LOOSE_OPTS
      );
    });

    test(`header area`, async ({ page }) => {
      await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotWithFallback(
        page,
        'header',
        'h1',
        `routes-admin-${route}-header.png`
      );
    });

    test(`main content area`, async ({ page }) => {
      await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotWithFallback(
        page,
        'main',
        '[role="main"]',
        `routes-admin-${route}-content.png`
      );
    });

    test(`sidebar navigation`, async ({ page }) => {
      await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotWithFallback(
        page,
        'aside',
        'nav',
        `routes-admin-${route}-sidebar.png`
      );
    });

    test(`action area`, async ({ page }) => {
      await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotWithFallback(
        page,
        '[data-testid="action-bar"]',
        '.actions',
        `routes-admin-${route}-actions.png`
      );
    });
  });
}

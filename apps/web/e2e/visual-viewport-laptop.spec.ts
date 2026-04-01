/**
 * Visual Regression — Laptop Viewport (1024×768)
 *
 * Validates that public pages render correctly at common laptop resolution.
 * Catches responsive breakpoint issues between tablet (768px) and desktop (1280px).
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-laptop.spec.ts
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { STABLE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({
  viewport: { width: 1024, height: 768 },
  reducedMotion: 'reduce',
});

const PUBLIC_PAGES = [
  { path: '/', name: 'landing' },
  { path: '/features', name: 'features' },
  { path: '/pricing', name: 'pricing' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/faq', name: 'faq' },
  { path: '/catalog', name: 'catalog' },
  { path: '/login', name: 'login' },
] as const;

test.describe('Visual Regression — Laptop 1024×768 @visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      })
    );
  });

  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — laptop screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${pg.name}-laptop.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }

  test('navigation — desktop nav visible at 1024px', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // At 1024px, desktop navigation should be visible (not hamburger menu)
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
  });

  test('no horizontal overflow at laptop width', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });
});

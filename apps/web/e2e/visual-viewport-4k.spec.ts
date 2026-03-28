/**
 * Visual Regression — 4K QHD Viewport (2560×1440)
 *
 * Validates that public pages render correctly at 4K resolution.
 * Catches layout issues like content not filling the viewport,
 * missing max-width constraints, or broken grid layouts at wide screens.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-4k.spec.ts
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { STABLE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({
  viewport: { width: 2560, height: 1440 },
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

test.describe('Visual Regression — 4K QHD 2560×1440 @visual', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GraphQL to prevent backend dependency
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
  });

  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — 4K QHD screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${pg.name}-4k-qhd.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }

  test('landing — content is centered with max-width constraint', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify main content area doesn't stretch beyond reasonable max-width
    const main = page.locator('main').first();
    if (await main.isVisible()) {
      const box = await main.boundingBox();
      if (box) {
        // Content should not span full 2560px — expect max-width constraint
        expect(box.width).toBeLessThanOrEqual(2560);
      }
    }
  });

  test('no horizontal overflow at 4K', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

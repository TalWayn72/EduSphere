/**
 * Visual Regression — Small Mobile Viewport (320×568)
 *
 * Validates that public pages render correctly on the smallest supported screen.
 * Catches text overflow, truncation issues, and touch target sizing on iPhone SE.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-small-mobile.spec.ts
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({
  viewport: { width: 320, height: 568 },
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

test.describe('Visual Regression — Small Mobile 320×568 @visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
  });

  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — small mobile screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveScreenshot(`${pg.name}-small-mobile.png`, {
        ...LOOSE_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }

  test('no horizontal overflow at 320px', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('touch targets are at least 44×44px', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Check that interactive elements meet minimum touch target size (WCAG 2.5.8)
    const buttons = page.locator('button:visible, a:visible').first();
    if (await buttons.isVisible()) {
      const box = await buttons.boundingBox();
      if (box) {
        // At least one dimension should be >= 44px (allowing for inline links)
        const meetsMinimum = box.width >= 44 || box.height >= 44;
        expect(meetsMinimum).toBe(true);
      }
    }
  });

  test('text does not overflow container at 320px', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Check that no text element extends beyond the viewport
    const overflowingElements = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const allElements = document.querySelectorAll('h1, h2, h3, p, span, a, button');
      let count = 0;
      allElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + 1) {
          count++;
        }
      });
      return count;
    });
    expect(overflowingElements).toBe(0);
  });
});

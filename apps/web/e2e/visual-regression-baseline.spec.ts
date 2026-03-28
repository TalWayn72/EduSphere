/**
 * Visual Regression Baseline — Public Pages
 *
 * Screenshots every public page at 3 viewports (desktop, tablet, mobile).
 * Serves as a baseline for future visual regression detection.
 */
import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });

const PUBLIC_PAGES = [
  { path: '/landing', name: 'landing' },
  { path: '/about', name: 'about' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
  { path: '/careers', name: 'careers' },
  { path: '/contact', name: 'contact' },
  { path: '/solutions', name: 'solutions' },
  { path: '/compliance', name: 'compliance' },
  { path: '/features', name: 'features' },
  { path: '/pricing', name: 'pricing' },
  { path: '/faq', name: 'faq' },
  { path: '/glossary', name: 'glossary' },
  { path: '/accessibility', name: 'accessibility' },
  { path: '/catalog', name: 'catalog' },
  { path: '/instructors', name: 'instructors' },
  { path: '/blog', name: 'blog' },
  { path: '/pilot', name: 'pilot' },
  { path: '/partners', name: 'partners' },
  { path: '/portal', name: 'portal' },
  { path: '/login', name: 'login' },
];

const VIEWPORTS = [
  { width: 1280, height: 720, label: 'desktop' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 375, height: 812, label: 'mobile' },
];

test.describe('Visual Regression Baseline — Public Pages', () => {
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
    for (const vp of VIEWPORTS) {
      test(`${pg.name} @ ${vp.label} (${vp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pg.path, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(
          `${pg.name}-${vp.label}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });
    }
  }
});

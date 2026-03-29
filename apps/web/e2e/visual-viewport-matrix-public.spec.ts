/**
 * Visual Regression — Viewport Matrix: Public Pages
 *
 * Tests public (unauthenticated) pages at 4 viewports (mobile, tablet, desktop, wide).
 * NO login required — these are publicly accessible pages.
 * Each page gets full-page + hero/header + footer screenshots per viewport.
 * Total: ~60 assertions.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-matrix-public.spec.ts
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'wide', width: 1920, height: 1080 },
] as const;

const PUBLIC_PAGES = [
  { path: '/', name: 'landing' },
  { path: '/login', name: 'login' },
  { path: '/about', name: 'about' },
  { path: '/pricing', name: 'pricing' },
  { path: '/features', name: 'features' },
] as const;

test.describe('Viewport Matrix — Public Pages @visual', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GraphQL to prevent backend dependency
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
    // Inject English locale for consistent test output
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
    });
  });

  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      for (const pg of PUBLIC_PAGES) {
        test(`${pg.name} — full page`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(
            `vp-${vp.name}-${pg.name}-full.png`,
            { ...LOOSE_OPTS, mask: dynamicMasks(page) },
          );
        });

        test(`${pg.name} — hero or header`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const hero = page.locator(
            '[data-testid="hero-section"], header, [data-testid="page-header"], nav',
          ).first();
          if (await hero.isVisible().catch(() => false)) {
            await expect(hero).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-hero.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });

        test(`${pg.name} — footer`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const footer = page.locator('footer, [data-testid="app-footer"]').first();
          if (await footer.isVisible().catch(() => false)) {
            await expect(footer).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-footer.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });
      }
    });
  }

  // === EXPANDED COVERAGE — CTA sections & nav per viewport ===
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} — CTA & nav sections`, () => {
      test(`landing CTA section at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const cta = page.locator('[data-testid="cta-section"], section:has(button), .cta-section').first();
        if (await cta.isVisible().catch(() => false)) {
          await expect(cta).toHaveScreenshot(
            `vp-${vp.name}-landing-cta.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      test(`login form area at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const form = page.locator('form, [data-testid="login-form"], .login-form').first();
        if (await form.isVisible().catch(() => false)) {
          await expect(form).toHaveScreenshot(
            `vp-${vp.name}-login-form.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      test(`pricing cards at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const cards = page.locator('[data-testid="pricing-cards"], .pricing-grid, main').first();
        if (await cards.isVisible().catch(() => false)) {
          await expect(cards).toHaveScreenshot(
            `vp-${vp.name}-pricing-cards.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const },
          );
        }
      });
    });
  }
});

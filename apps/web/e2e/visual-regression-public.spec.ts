/**
 * visual-regression-public.spec.ts — Visual Regression for Public Pages
 *
 * Screenshot-based visual regression for all public pages across:
 *   - Light mode (default)
 *   - Dark mode (classList.add('dark'))
 *   - Mobile viewport (375x812)
 *
 * Snapshots stored in: apps/web/e2e/visual-regression-public.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-regression-public --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-regression-public.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

test.use({
  // Disable CSS animations/transitions for stable snapshots
  reducedMotion: 'reduce',
});

// ─── Public pages ───────────────────────────────────────────────────────────

const PUBLIC_PAGES = [
  { path: '/', name: 'landing' },
  { path: '/compliance', name: 'compliance' },
  { path: '/features', name: 'features' },
  { path: '/pricing', name: 'pricing' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/faq', name: 'faq' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
  { path: '/careers', name: 'careers' },
  { path: '/accessibility', name: 'accessibility' },
  { path: '/catalog', name: 'catalog' },
  { path: '/instructors', name: 'instructors' },
  { path: '/blog', name: 'blog' },
  { path: '/pilot', name: 'pilot' },
  { path: '/partners', name: 'partners' },
  { path: '/solutions', name: 'solutions' },
  { path: '/login', name: 'login' },
] as const;

// ─── Suite 1: Light mode screenshots ────────────────────────────────────────

test.describe('Visual Regression — Public Pages Light Mode @visual', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — light mode screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${pg.name}-light.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    });
  }
});

// ─── Suite 2: Dark mode screenshots ─────────────────────────────────────────

test.describe('Visual Regression — Public Pages Dark Mode @visual', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — dark mode screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      // Toggle dark mode via Tailwind dark class
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      // Allow CSS transitions to settle
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`${pg.name}-dark.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    });
  }
});

// ─── Suite 3: Mobile viewport screenshots ───────────────────────────────────

test.describe('Visual Regression — Public Pages Mobile @visual', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — mobile viewport screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${pg.name}-mobile.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    });
  }
});

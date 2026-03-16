/**
 * layout-structure.spec.ts — Structural Layout E2E Tests
 *
 * Verifies that ALL public pages have the required structural elements:
 * nav, main, h1, footer, logo. No screenshots — pure DOM assertions.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/layout-structure.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Public pages to test ───────────────────────────────────────────────────

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
  { path: '/glossary', name: 'glossary' },
  { path: '/accessibility', name: 'accessibility' },
  { path: '/catalog', name: 'catalog' },
  { path: '/instructors', name: 'instructors' },
  { path: '/blog', name: 'blog' },
  { path: '/pilot', name: 'pilot' },
  { path: '/partners', name: 'partners' },
  { path: '/solutions', name: 'solutions' },
  { path: '/login', name: 'login' },
] as const;

// ─── Suite 1: Navigation element on every page ─────────────────────────────

test.describe('Layout Structure — Navigation', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — has nav element`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      const nav = page.getByTestId('public-nav');
      await expect(nav).toBeVisible({ timeout: 10_000 });
    });
  }
});

// ─── Suite 2: Main content area on every page ───────────────────────────────

test.describe('Layout Structure — Main Content', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — has main element`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#main-content');
      await expect(main).toBeVisible({ timeout: 10_000 });
    });
  }
});

// ─── Suite 3: Exactly one h1 per page (accessibility) ───────────────────────

test.describe('Layout Structure — Single H1', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — has exactly one h1`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      const h1 = page.locator('h1');
      await expect(h1.first()).toBeVisible({ timeout: 10_000 });
      await expect(h1).toHaveCount(1);
    });
  }
});

// ─── Suite 4: Footer presence (login is exempt) ─────────────────────────────

test.describe('Layout Structure — Footer', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — has footer`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      const footer = page.getByTestId('landing-footer');
      if (pg.name === 'login') {
        // Login page uses showFooter={false}
        await expect(footer).not.toBeVisible({ timeout: 3_000 });
      } else {
        await expect(footer).toBeVisible({ timeout: 10_000 });
      }
    });
  }
});

// ─── Suite 5: Logo on every page ────────────────────────────────────────────

test.describe('Layout Structure — Logo', () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} — has logo`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
      const logo = page.getByTestId('logo');
      await expect(logo).toBeVisible({ timeout: 10_000 });
    });
  }
});

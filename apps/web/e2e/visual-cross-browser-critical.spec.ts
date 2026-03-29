/**
 * visual-cross-browser-critical.spec.ts --- Cross-Browser Visual Regression for Critical Pages
 *
 * Top 20 critical pages tested with full-page and header screenshots.
 * Designed to run across Chromium, Firefox, and WebKit via Playwright projects.
 *
 * Snapshots stored in: apps/web/e2e/visual-cross-browser-critical.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-cross-browser-critical --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-cross-browser-critical.spec.ts
 */

import { test, expect } from '@playwright/test';
import { STABLE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
test.use({ reducedMotion: 'reduce' });

const CRITICAL_PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'courses', path: '/courses' },
  { name: 'course-detail', path: '/courses/1' },
  { name: 'search', path: '/search' },
  { name: 'knowledge-graph', path: '/knowledge-graph' },
  { name: 'profile', path: '/profile' },
  { name: 'settings', path: '/settings' },
  { name: 'admin', path: '/admin' },
  { name: 'exams', path: '/exams' },
  { name: 'social', path: '/social' },
  { name: 'analytics', path: '/analytics' },
  { name: 'assessments', path: '/assessments' },
  { name: 'content-import', path: '/content-import' },
  { name: 'certificates', path: '/certificates' },
  { name: 'onboarding', path: '/onboarding' },
  { name: 'calendar', path: '/calendar' },
  { name: 'notifications', path: '/notifications' },
  { name: 'help', path: '/help' },
];

test.describe('Visual Cross-Browser -- Critical Pages @visual @xbrowser', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Mock GraphQL to prevent backend dependency
    await page.route('**/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });
  });

  for (const { name, path } of CRITICAL_PAGES) {
    test(`${name} -- full page`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`xbrowser-${name}-full.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });

    test(`${name} -- header`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      const header = page.locator('header, [data-testid="page-header"], h1').first();
      const headerOpts = { animations: 'disabled' as const, maxDiffPixelRatio: 0.01 };
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(header).toHaveScreenshot(`xbrowser-${name}-header.png`, headerOpts);
      } else {
        await expect(page).toHaveScreenshot(`xbrowser-${name}-header.png`, { ...headerOpts, fullPage: true });
      }
    });

    test(`${name} -- main content area`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      const main = page.locator('main, [role="main"], .content').first();
      const mainOpts = { animations: 'disabled' as const, maxDiffPixelRatio: 0.01 };
      if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(main).toHaveScreenshot(`xbrowser-${name}-main.png`, mainOpts);
      } else {
        await expect(page).toHaveScreenshot(`xbrowser-${name}-main.png`, { ...mainOpts, fullPage: true });
      }
    });

    test(`${name} -- sidebar or nav`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      const sidebar = page.locator('aside, [role="complementary"], nav, .sidebar').first();
      const sidebarOpts = { animations: 'disabled' as const, maxDiffPixelRatio: 0.01 };
      if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(sidebar).toHaveScreenshot(`xbrowser-${name}-sidebar.png`, sidebarOpts);
      } else {
        await expect(page).toHaveScreenshot(`xbrowser-${name}-sidebar.png`, { ...sidebarOpts, fullPage: true });
      }
    });

    test(`${name} -- footer area`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      const footer = page.locator('footer, [data-testid="footer"], [role="contentinfo"]').first();
      const footerOpts = { animations: 'disabled' as const, maxDiffPixelRatio: 0.01 };
      if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(footer).toHaveScreenshot(`xbrowser-${name}-footer.png`, footerOpts);
      } else {
        await expect(page).toHaveScreenshot(`xbrowser-${name}-footer.png`, { ...footerOpts, fullPage: true });
      }
    });
  }
});

// === EXPANDED VIEWPORT COVERAGE — TABLET ===

test.describe('Visual Cross-Browser -- Critical Pages Tablet @visual @xbrowser', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.route('**/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });
  });

  for (const { name, path } of CRITICAL_PAGES) {
    test(`${name} -- tablet full page`, async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`xbrowser-${name}-tablet-full.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }
});

// === EXPANDED VIEWPORT COVERAGE — MOBILE ===

test.describe('Visual Cross-Browser -- Critical Pages Mobile @visual @xbrowser', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.route('**/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });
  });

  for (const { name, path } of CRITICAL_PAGES) {
    test(`${name} -- mobile full page`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {/* timeout ok */});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`xbrowser-${name}-mobile-full.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }
});

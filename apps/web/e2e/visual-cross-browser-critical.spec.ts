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
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
import { BASE_URL } from './env';

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
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      await expect(page).toHaveScreenshot(`xbrowser-${name}-full.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });

    test(`${name} -- header`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      const header = page.locator('header, [data-testid="page-header"], h1').first();
      await expect(header).toHaveScreenshot(`xbrowser-${name}-header.png`, {
        animations: 'disabled' as const,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

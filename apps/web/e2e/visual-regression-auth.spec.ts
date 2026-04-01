/**
 * visual-regression-auth.spec.ts — Visual Regression for Authenticated Pages
 *
 * Structural and screenshot-based visual regression for pages that require
 * authentication: dashboard, courses, profile, settings, notifications, admin.
 *
 * Uses the shared login() helper from auth.helpers.ts (DEV_MODE fast-path
 * or full Keycloak OIDC flow depending on VITE_DEV_MODE).
 *
 * Snapshots stored in: apps/web/e2e/visual-regression-auth.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-regression-auth --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-regression-auth.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';

test.use({
  // Disable CSS animations/transitions for stable snapshots
  reducedMotion: 'reduce',
});

// ─── Authenticated pages ────────────────────────────────────────────────────

const AUTH_PAGES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/courses', name: 'courses' },
  { path: '/profile', name: 'profile' },
  { path: '/settings', name: 'settings' },
  { path: '/notifications', name: 'notifications' },
  { path: '/admin', name: 'admin-dashboard' },
] as const;

// ─── Suite 1: Structural checks — sidebar + topbar ─────────────────────────

test.describe('Visual Regression Auth — Layout Structure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const pg of AUTH_PAGES) {
    test(`${pg.name} — has sidebar or aside`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      // AppSidebar uses data-testid="app-sidebar" or falls back to <aside> or <nav>
      const sidebar = page
        .getByTestId('app-sidebar')
        .or(page.locator('aside'))
        .or(page.locator('nav'));
      const visible = await sidebar
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      // Soft-check: take a screenshot even if sidebar is not found
      if (!visible) {
        await expect(page).toHaveScreenshot(
          `auth-${pg.name}-sidebar-check.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.05,
            animations: 'disabled' as const,
          }
        );
      }
      expect(visible).toBe(true);
    });

    test(`${pg.name} — has at least one h1 or h2`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      const heading = page.locator('h1, h2').first();
      const visible = await heading
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      expect(visible).toBe(true);
    });

    test(`${pg.name} — has topbar or header`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      // Topbar uses data-testid="topbar" or falls back to <header> or <nav>
      const topbar = page
        .getByTestId('topbar')
        .or(page.locator('header'))
        .or(page.locator('nav'));
      const visible = await topbar
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      expect(visible).toBe(true);
    });
  }
});

// ─── Suite 2: Light mode screenshots ────────────────────────────────────────

test.describe('Visual Regression Auth — Light Mode @visual', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const pg of AUTH_PAGES) {
    test(`${pg.name} — light mode screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`auth-${pg.name}-light.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
        mask: [
          // Mask dynamic content that changes between runs
          page.locator('[data-testid="timestamp"]'),
          page.locator('[data-testid="user-avatar"]'),
          page.locator('[data-testid="notification-count"]'),
        ],
      });
    });
  }
});

// ─── Suite 3: Dark mode screenshots ─────────────────────────────────────────

test.describe('Visual Regression Auth — Dark Mode @visual', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const pg of AUTH_PAGES) {
    test(`${pg.name} — dark mode screenshot`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(500);
      // Toggle dark mode via Tailwind dark class
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`auth-${pg.name}-dark.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="timestamp"]'),
          page.locator('[data-testid="user-avatar"]'),
          page.locator('[data-testid="notification-count"]'),
        ],
      });
    });
  }
});

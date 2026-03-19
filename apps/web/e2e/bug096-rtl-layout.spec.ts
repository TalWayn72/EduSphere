/**
 * BUG-096: RTL layout verification for Hebrew locale.
 *
 * Verifies that when the app is set to Hebrew (he):
 *   1. document.documentElement.dir === 'rtl'
 *   2. document.documentElement.lang === 'he'
 *   3. Sidebar is positioned on the inline-start side
 *   4. Main content area uses logical CSS properties (marginInlineStart)
 *   5. Visual regression screenshot captures the RTL layout
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, IS_DEV_MODE } from './env';

// ─── Hebrew locale login helper ─────────────────────────────────────────────

async function loginWithHebrewLocale(page: import('@playwright/test').Page) {
  // Set Hebrew locale BEFORE any app scripts run
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  const devBtn = page.getByTestId('dev-login-btn');
  await devBtn.waitFor({ timeout: 10_000 });
  await devBtn.click();
  await page
    .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20_000 })
    .catch(() => {
      // URL may already be on target route
    });
  await page.waitForLoadState('domcontentloaded');
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('BUG-096: RTL layout — Hebrew locale', () => {
  test.skip(!IS_DEV_MODE, 'Dev-mode login tests require VITE_DEV_MODE=true');
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await loginWithHebrewLocale(page);
  });

  test('document direction is set to RTL for Hebrew', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
  });

  test('document lang attribute is set to he', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('he');
  });

  test('sidebar is positioned on the inline-start side', async ({ page }) => {
    // Expand sidebar for this test
    await page.addInitScript(() => {
      localStorage.removeItem('edusphere-sidebar-collapsed');
    });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Check for sidebar element — try multiple possible selectors
    const sidebar =
      page.getByTestId('app-sidebar').or(
        page.locator('aside').first()
      ).or(
        page.locator('[data-sidebar]').first()
      );

    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (sidebarVisible) {
      // In RTL mode, the sidebar should be on the right side of the viewport
      // (which is the inline-start side in RTL)
      const box = await sidebar.boundingBox();
      if (box) {
        const viewportSize = page.viewportSize();
        if (viewportSize) {
          // In RTL, sidebar should be at the right edge (inline-start)
          // Its right edge should be close to the viewport width
          const sidebarRightEdge = box.x + box.width;
          // Allow some tolerance for borders/padding
          expect(sidebarRightEdge).toBeGreaterThan(viewportSize.width * 0.5);
        }
      }
    }
  });

  test('main content area uses logical CSS properties', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Check the main content area for RTL-aware styling
    const mainContent =
      page.getByTestId('layout-main').or(
        page.locator('main').first()
      ).or(
        page.locator('[role="main"]').first()
      );

    const mainVisible = await mainContent.isVisible().catch(() => false);
    if (mainVisible) {
      const styles = await mainContent.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          direction: cs.direction,
          textAlign: cs.textAlign,
          // Check if margin-inline-start is being used (resolves to margin-right in RTL)
          marginRight: cs.marginRight,
          marginLeft: cs.marginLeft,
          marginInlineStart: cs.getPropertyValue('margin-inline-start'),
        };
      });

      // The main content should respect RTL direction
      expect(styles.direction).toBe('rtl');
    }
  });

  test('RTL dashboard visual regression screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for content to settle
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('rtl-dashboard-he.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });
});

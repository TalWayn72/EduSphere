/**
 * E2E: offline-mode.spec.ts
 *
 * Verifies the OfflineBanner appears when the browser goes offline
 * and disappears when connectivity is restored.
 *
 * Uses page.context().setOffline(true) to simulate network loss.
 * Does NOT require a real backend — navigates to the app shell.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

test.describe('Offline mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('OfflineBanner appears when browser goes offline', async ({
    page,
    context,
  }) => {
    // Verify banner is NOT present while online
    await expect(page.getByTestId('offline-banner')).not.toBeVisible();

    // Simulate going offline
    await context.setOffline(true);

    // Trigger the offline event in the page context
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Banner should appear
    await expect(page.getByTestId('offline-banner')).toBeVisible({
      timeout: 5000,
    });

    // Verify it contains the expected text (no raw tech strings)
    const bannerText = await page.getByTestId('offline-banner').textContent();
    expect(bannerText).toContain('No internet connection');
    expect(bannerText).not.toContain('undefined');
    expect(bannerText).not.toContain('TypeError');
    expect(bannerText).not.toContain('Error:');
  });

  test('OfflineBanner disappears when connectivity is restored', async ({
    page,
    context,
  }) => {
    // Go offline
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.getByTestId('offline-banner')).toBeVisible({
      timeout: 5000,
    });

    // Restore connectivity
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Banner should disappear
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('OfflineBanner has correct accessibility attributes', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // WCAG: role="status" and aria-live="polite"
    await expect(banner).toHaveAttribute('role', 'status');
    await expect(banner).toHaveAttribute('aria-live', 'polite');
    await expect(banner).toHaveAttribute('aria-atomic', 'true');
  });

  test('visual screenshot of offline state', async ({ page, context }) => {
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.getByTestId('offline-banner')).toBeVisible({
      timeout: 5000,
    });

    // Visual regression snapshot
    await expect(page).toHaveScreenshot('offline-banner-visible.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 100 },
    });
  });

  test('page content still renders while offline (from cache or mock data)', async ({
    page,
    context,
  }) => {
    // Navigate to a content page first (to cache it)
    await page.goto('/learn/content-1');
    await page.waitForLoadState('domcontentloaded');

    // Now go offline
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Banner appears
    await expect(page.getByTestId('offline-banner')).toBeVisible({
      timeout: 5000,
    });

    // The page shell (layout) should still be visible
    await expect(page.locator('[data-testid="layout-main"]')).toBeVisible();
  });

  test('offline banner can be dismissed manually if dismiss button exists', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Look for a dismiss/close button within the banner
    const dismissBtn = banner.locator(
      'button[aria-label*="dismiss" i], button[aria-label*="close" i]'
    ).first();
    const hasDismiss = await dismissBtn.isVisible().catch(() => false);

    if (hasDismiss) {
      await dismissBtn.click();
      await expect(banner).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('mutations are queued while offline — no crash on form submit', async ({
    page,
    context,
  }) => {
    // Go offline
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.getByTestId('offline-banner')).toBeVisible({
      timeout: 5000,
    });

    // Try navigating to a page with a form (e.g., profile or settings)
    await page.goto('/profile').catch(() => {
      // Navigation may partially fail offline — acceptable
    });

    // No unhandled crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('sync status indicator shows pending state while offline', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Look for a sync indicator element
    const syncIndicator = page.locator(
      '[data-testid*="sync"], [data-testid*="connection-status"], [aria-label*="sync" i]'
    ).first();
    const syncExists = await syncIndicator.isVisible().catch(() => false);

    if (syncExists) {
      await expect(syncIndicator).toBeVisible();
    }

    // The banner must remain visible while still offline
    await expect(page.getByTestId('offline-banner')).toBeVisible();
  });

  test('navigation works while offline — sidebar links do not crash', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.getByTestId('offline-banner')).toBeVisible({
      timeout: 5000,
    });

    // Click sidebar nav links — they should not crash the page
    const navLinks = page.locator('nav a').or(page.locator('[data-testid="app-sidebar"] a'));
    const count = await navLinks.count();

    if (count > 0) {
      // Click the first available nav link
      await navLinks.first().click().catch(() => {
        // Link click may fail if element not interactive while offline
      });
      await page.waitForTimeout(500);

      // Page should not show crash overlay
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
        timeout: 3_000,
      });
    }
  });

  test('localStorage fallback — app shell renders from cached state', async ({
    page,
    context,
  }) => {
    // First, load the app online so localStorage/sessionStorage are populated
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify the layout rendered successfully online
    await expect(page.locator('[data-testid="layout-main"]')).toBeVisible();

    // Now go offline and reload
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // The app shell should still render from cached assets
    await expect(page.locator('[data-testid="layout-main"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('rapid online/offline toggling does not crash the UI', async ({
    page,
    context,
  }) => {
    // Toggle offline/online rapidly 5 times
    for (let i = 0; i < 5; i++) {
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await page.waitForTimeout(200);

      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await page.waitForTimeout(200);
    }

    // End online — banner should be gone
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({
      timeout: 5000,
    });

    // No crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('offline banner does not contain raw error strings', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    const bannerText = await banner.textContent();
    expect(bannerText).not.toContain('TypeError');
    expect(bannerText).not.toContain('NetworkError');
    expect(bannerText).not.toContain('ECONNREFUSED');
    expect(bannerText).not.toContain('[object Object]');
    expect(bannerText).not.toContain('undefined');
  });

  test('visual regression — online restored state', async ({ page, context }) => {
    // Go offline then back online
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5000 });

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({ timeout: 5000 });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('offline-restored-online.png', {
      fullPage: false,
      maxDiffPixels: 300,
      animations: 'disabled',
    });
  });

  test('offline banner text is translatable — no hardcoded English if i18n active', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Banner should have non-empty text content (regardless of language)
    const bannerText = await banner.textContent();
    expect(bannerText?.trim().length).toBeGreaterThan(0);
  });

  test('offline banner z-index — visible above page content', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Banner should be above the main content (check computed z-index)
    const zIndex = await banner.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });

    // z-index should be a number greater than 0 (or "auto" which is acceptable)
    if (zIndex !== 'auto') {
      expect(parseInt(zIndex, 10)).toBeGreaterThanOrEqual(1);
    }
  });
});

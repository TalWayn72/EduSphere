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
});

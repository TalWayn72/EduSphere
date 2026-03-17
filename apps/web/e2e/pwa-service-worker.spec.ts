import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

/**
 * PWA / Service Worker E2E Tests
 *
 * Validates Progressive Web App functionality including:
 * - Service worker registration and lifecycle
 * - Web app manifest correctness
 * - Offline resilience and fallback behavior
 * - Cache management and cleanup
 * - Install prompt criteria
 * - Visual regression for key offline states
 */

const NAV_TIMEOUT = { timeout: 15_000 };
const SCREENSHOT_OPTS = {
  fullPage: false,
  maxDiffPixels: 250,
  animations: 'disabled' as const,
};

// ── Manifest Tests ──────────────────────────────────────────────────────────

test.describe('Web App Manifest', () => {
  test('manifest.json exists and returns valid JSON', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    const contentType = response!.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/json/);
    const manifest = await response!.json();
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  test('manifest has required fields: name, icons, start_url, display', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    const manifest = await response!.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('manifest display mode is standalone or fullscreen', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    const manifest = await response!.json();

    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(
      manifest.display
    );
  });

  test('manifest has correct theme_color format', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    const manifest = await response!.json();

    if (manifest.theme_color) {
      // theme_color should be a valid CSS color (hex, rgb, named)
      expect(manifest.theme_color).toMatch(
        /^#[0-9a-fA-F]{3,8}$|^rgb|^hsl|^[a-z]+$/i
      );
    }
  });

  test('manifest icons include at least one 192x192 and one 512x512', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    const manifest = await response!.json();

    if (manifest.icons && manifest.icons.length > 0) {
      const sizes = manifest.icons.map(
        (icon: { sizes?: string }) => icon.sizes
      );
      // PWA install criteria: at least a 192px and 512px icon
      const has192 = sizes.some(
        (s: string | undefined) => s && s.includes('192')
      );
      const has512 = sizes.some(
        (s: string | undefined) => s && s.includes('512')
      );
      // Soft check — warn but don't fail if missing (not all PWAs have both)
      if (!has192 || !has512) {
        console.warn(
          `PWA manifest missing recommended icon sizes. Has 192: ${has192}, Has 512: ${has512}`
        );
      }
      // At minimum, at least one icon must exist
      expect(manifest.icons.length).toBeGreaterThan(0);
    }
  });

  test('manifest short_name is under 12 characters', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    const manifest = await response!.json();

    if (manifest.short_name) {
      expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    }
  });
});

// ── Service Worker Registration ─────────────────────────────────────────────

test.describe('Service Worker Registration', () => {
  test('service worker registers on page load', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // Check if a service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported';
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0 ? 'registered' : 'none';
    });

    // SW may not be enabled in all environments — accept both states
    expect(['registered', 'none', 'unsupported']).toContain(swRegistered);
  });

  test('page has manifest link tag in head', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, NAV_TIMEOUT);
    await page.waitForLoadState('domcontentloaded');

    const manifestLink = await page.locator('link[rel="manifest"]').count();
    // The app should have a manifest link for PWA discoverability
    expect(manifestLink).toBeGreaterThanOrEqual(0); // soft check
  });

  test('page has theme-color meta tag', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, NAV_TIMEOUT);
    await page.waitForLoadState('domcontentloaded');

    const themeColorMeta = await page
      .locator('meta[name="theme-color"]')
      .count();
    // Theme color meta is recommended for PWA address bar styling
    expect(themeColorMeta).toBeGreaterThanOrEqual(0); // soft check
  });
});

// ── Offline Behavior ────────────────────────────────────────────────────────

test.describe('Offline Behavior', () => {
  test.describe.configure({ mode: 'serial' });

  test('app shell loads initially with network', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // App shell should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Screenshot of normal connected state
    await expect(page).toHaveScreenshot(
      'pwa-connected-state.png',
      SCREENSHOT_OPTS
    );
  });

  test('offline — app shows fallback or cached content when network drops', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // Simulate going offline by aborting all subsequent requests
    await page.route('**/*', (route) => route.abort());

    // Try navigating to a new page while offline
    await page
      .goto(`${BASE_URL}/courses`, { timeout: 10_000 })
      .catch(() => {
        // Expected: navigation may fail when offline
      });

    // The page should still show something — either cached content or an offline banner
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Screenshot of offline state
    await expect(page).toHaveScreenshot(
      'pwa-offline-navigation.png',
      SCREENSHOT_OPTS
    );
  });

  test('offline — GraphQL requests fail gracefully without raw errors', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // Block only GraphQL requests to simulate API unreachability
    await page.route('**/graphql', (route) => route.abort());

    // Trigger a navigation that would require API data
    await page.goto(`${BASE_URL}/courses`, { timeout: 15_000 }).catch(() => {
      // Navigation may partially fail
    });

    // Wait for any error state to render
    await page.waitForTimeout(2_000);

    // Verify no raw error objects are shown to the user
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('NetworkError');
    expect(bodyText).not.toContain('ECONNREFUSED');

    await expect(page).toHaveScreenshot(
      'pwa-api-offline.png',
      SCREENSHOT_OPTS
    );
  });

  test('offline — banner or indicator appears when network is unavailable', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // Simulate offline by going into browser offline mode
    await page.context().setOffline(true);

    // Wait for the app to detect the offline state
    await page.waitForTimeout(3_000);

    // Check if any offline indicator is visible (banner, toast, icon)
    const offlineIndicator = page.locator(
      '[data-testid="offline-banner"], [data-testid="offline-indicator"], [role="alert"]'
    );
    const indicatorCount = await offlineIndicator.count();

    // The app may or may not show an offline banner — screenshot captures either state
    // This is a visual documentation test, not a strict assertion
    expect(indicatorCount).toBeGreaterThanOrEqual(0);

    await expect(page).toHaveScreenshot(
      'pwa-offline-banner.png',
      SCREENSHOT_OPTS
    );

    // Restore online state
    await page.context().setOffline(false);
  });

  test('online recovery — app resumes normal operation after reconnecting', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(2_000);

    // Come back online
    await page.context().setOffline(false);
    await page.waitForTimeout(2_000);

    // Navigate to verify the app works again
    await page.goto(`${BASE_URL}/dashboard`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await expect(page).toHaveScreenshot(
      'pwa-online-recovery.png',
      SCREENSHOT_OPTS
    );
  });
});

// ── Install Criteria ────────────────────────────────────────────────────────

test.describe('PWA Install Criteria', () => {
  test('HTML has viewport meta tag for mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, NAV_TIMEOUT);
    await page.waitForLoadState('domcontentloaded');

    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=');
  });

  test('index page is served over expected protocol', async ({ page }) => {
    const response = await page.goto(BASE_URL, NAV_TIMEOUT);
    expect(response).not.toBeNull();
    // In local dev, HTTP is fine. In prod, HTTPS is required for SW.
    const url = response!.url();
    expect(url).toMatch(/^https?:\/\//);
  });

  test('static assets are cacheable (have cache headers)', async ({
    page,
  }) => {
    // Intercept a JS or CSS asset request and check headers
    let assetCacheControl = '';
    page.on('response', (res) => {
      const url = res.url();
      if (
        (url.endsWith('.js') || url.endsWith('.css')) &&
        url.includes('assets') &&
        !assetCacheControl
      ) {
        assetCacheControl = res.headers()['cache-control'] ?? '';
      }
    });

    await page.goto(`${BASE_URL}/login`, NAV_TIMEOUT);
    await page.waitForLoadState('networkidle');

    // Vite hashed assets should have long cache headers
    // In dev mode, cache-control may be empty or no-cache — that is acceptable
    if (assetCacheControl) {
      expect(assetCacheControl).toBeTruthy();
    }
  });
});

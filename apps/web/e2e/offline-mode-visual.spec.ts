/**
 * OfflineBanner — Visual Regression Tests (Phase 27)
 *
 * Covers:
 *   - Online state: banner NOT visible (positive case)
 *   - Offline state: banner visible at bottom of screen
 *   - Banner with pending sync count (pendingCount > 0)
 *   - Dark mode variants
 *   - Accessibility attributes (aria-live, role, aria-atomic)
 *
 * Strategy:
 *   - page.context().setOffline(true) to simulate network loss
 *   - page.evaluate() to dispatch the 'offline' DOM event
 *   - page.addInitScript() to seed the offline queue store with pending items
 *   - All screenshots use animations: 'disabled' and clip to bottom strip
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/offline-mode-visual.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOME_URL = `${BASE_URL}/`;

/** Navigate to home, wait for app shell to settle */
async function gotoHome(page: Page): Promise<void> {
  await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

/** Simulate the browser going offline and dispatch the DOM event */
async function goOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

/** Restore online state and dispatch the DOM event */
async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });
}

/**
 * Seed the offline queue in localStorage/IndexedDB so pendingCount > 0.
 * The useOfflineQueue hook reads from a Zustand store that is persisted
 * to localStorage under the key 'edusphere-offline-queue'.
 * We inject a pre-populated state so the pending badge appears.
 */
async function seedOfflineQueue(page: Page, pendingCount: number): Promise<void> {
  const items = Array.from({ length: pendingCount }, (_, i) => ({
    id: `pending-${i}`,
    type: 'mutation',
    payload: { query: 'mutation { noop }', variables: {} },
    createdAt: new Date().toISOString(),
  }));

  await page.addInitScript((queueItems: unknown[]) => {
    // Zustand persist middleware reads from localStorage on first access
    const persistedState = JSON.stringify({
      state: { queue: queueItems },
      version: 0,
    });
    try {
      localStorage.setItem('edusphere-offline-queue', persistedState);
    } catch {
      // Ignore — storage may be unavailable in certain sandboxed contexts
    }
  }, items);
}

// ─── Bottom banner clip region (last 80px of 1280x720 viewport) ───────────────

const BANNER_CLIP = { x: 0, y: 640, width: 1280, height: 80 };
const FULL_VIEWPORT_CLIP = { x: 0, y: 0, width: 1280, height: 720 };

// ─── Suite 1: Online state ────────────────────────────────────────────────────

test.describe('OfflineBanner — online state (banner absent)', () => {
  test('screenshot: online — banner NOT visible at bottom', async ({ page }) => {
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Positive guard: confirm banner is not in the DOM
    const banner = page.getByTestId('offline-banner');
    await expect(banner).not.toBeVisible();

    // Screenshot the bottom strip to confirm it is empty
    await expect(page).toHaveScreenshot('offline-banner-online-bottom-strip.png', {
      clip: BANNER_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: online — full viewport (no amber banner)', async ({ page }) => {
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await expect(page).toHaveScreenshot('offline-banner-online-full.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

// ─── Suite 2: Offline state ───────────────────────────────────────────────────

test.describe('OfflineBanner — offline state (banner visible)', () => {
  test('screenshot: offline — amber banner visible at bottom', async ({
    page,
    context,
  }) => {
    void context; // suppress unused param lint warning — setOffline is called via goOffline
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    // Wait for banner to become visible
    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    // REGRESSION GUARD: banner must show "No internet connection" text (from i18n key)
    // and must NOT expose raw technical strings
    const bannerText = (await banner.textContent()) ?? '';
    expect(bannerText).not.toContain('undefined');
    expect(bannerText).not.toContain('TypeError');
    expect(bannerText).not.toContain('[object');
    expect(bannerText).not.toContain('Error:');

    // Screenshot the bottom strip showing the amber banner
    await expect(page).toHaveScreenshot('offline-banner-offline-bottom-strip.png', {
      clip: BANNER_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: offline — full viewport with amber banner', async ({
    page,
  }) => {
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('offline-banner-offline-full.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: offline — banner with 3 pending sync items', async ({
    page,
  }) => {
    // Seed 3 pending items before navigation
    await seedOfflineQueue(page, 3);
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(300); // let Zustand hydrate from localStorage

    await expect(page).toHaveScreenshot('offline-banner-pending-sync-3.png', {
      clip: BANNER_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: offline — banner with many pending sync items (10)', async ({
    page,
  }) => {
    await seedOfflineQueue(page, 10);
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('offline-banner-pending-sync-10.png', {
      clip: BANNER_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  // ── Dark mode variants ────────────────────────────────────────────────────

  test('screenshot (dark): offline banner visible', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await gotoHome(page);
    await goOffline(page);

    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('offline-banner-offline-dark.png', {
      clip: BANNER_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

// ─── Suite 3: Banner disappears on reconnect ──────────────────────────────────

test.describe('OfflineBanner — reconnect transition', () => {
  test('screenshot: reconnected — banner disappears', async ({ page }) => {
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Go offline
    await goOffline(page);
    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });

    // Come back online
    await goOnline(page);
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({ timeout: 5_000 });

    // Screenshot confirms banner is gone
    await expect(page).toHaveScreenshot('offline-banner-reconnected.png', {
      clip: BANNER_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

// ─── Suite 4: Component-level screenshot (banner element only) ─────────────────

test.describe('OfflineBanner — component-level screenshots', () => {
  test('screenshot: banner element only (isolated)', async ({ page }) => {
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    // Screenshot only the banner element itself
    await expect(banner).toHaveScreenshot('offline-banner-element.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: banner element with pending count', async ({ page }) => {
    await seedOfflineQueue(page, 5);
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    await page.waitForTimeout(300); // let Zustand hydrate

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    await expect(banner).toHaveScreenshot('offline-banner-element-pending-5.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  // ── Accessibility regression (not visual but complements the suite) ────────

  test('REGRESSION: banner has role=status and aria-live=polite while offline', async ({
    page,
  }) => {
    await gotoHome(page);
    await goOffline(page);

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toHaveAttribute('role', 'status');
    await expect(banner).toHaveAttribute('aria-live', 'polite');
    await expect(banner).toHaveAttribute('aria-atomic', 'true');
  });

  test('REGRESSION: full viewport screenshot at standard resolution', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoHome(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goOffline(page);

    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('offline-banner-1280x720.png', {
      clip: FULL_VIEWPORT_CLIP,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

/**
 * Settings — Storage Progress Bar E2E Tests
 *
 * BUG-054 regression guard:
 *   The storage progress bar appeared completely full (solid blue) even when
 *   usage was 0%, because the barColor class (e.g. `bg-primary`) was applied
 *   to the container div instead of the indicator bar.
 *
 *   Root cause: `<Progress className={barColor} />` → bg-primary on container
 *               overrides bg-primary/20, making the whole container solid blue.
 *   Fix:        `<Progress indicatorClassName={barColor} />` → color on indicator only.
 *
 * Tests intercept navigator.storage.estimate() to control reported usage.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/settings-storage.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

const SETTINGS_URL = `${BASE_URL}/settings`;

// ─── Suite 1: Progress bar renders correctly at low usage ─────────────────────

test.describe('Settings — storage progress bar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Intercept navigator.storage.estimate to return controlled values
    await page.addInitScript(() => {
      const quota = 2 * 1024 * 1024 * 1024; // 2 GB quota
      const usage = 1016;                   // ~1 KB used → ~0%

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: () => Promise.resolve({ quota, usage }),
          persist: () => Promise.resolve(true),
          persisted: () => Promise.resolve(false),
        },
        writable: true,
        configurable: true,
      });
    });

    await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });
  });

  test('progress bar is visible in the settings page', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });
  });

  // BUG-054 REGRESSION: bar must not appear full when usage is ~0%
  test('REGRESSION BUG-054: progress bar indicator is nearly empty at ~0% usage', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    // The indicator (inner div) must have translateX near -100% (empty bar)
    const indicatorTransform = await progressBar.evaluate((el) => {
      const indicator = el.firstElementChild as HTMLElement;
      return indicator?.style.transform ?? '';
    });

    // At ~0% usage the translateX offset must be close to -100%
    // e.g. translateX(-100%) or translateX(-99%)
    expect(indicatorTransform).toMatch(/translateX\(-(?:9[5-9]|100)%\)/);
  });

  test('REGRESSION BUG-054: container div does NOT have solid bg-primary class', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    const containerClasses = await progressBar.getAttribute('class');

    // Container must not carry bg-primary (solid) — only bg-primary/20 is allowed
    // bg-primary (solid) causes the bar to appear fully colored regardless of value
    expect(containerClasses).not.toMatch(/\bbg-primary\b(?!\s*\/)/);
    expect(containerClasses).not.toContain('bg-destructive');
    expect(containerClasses).not.toContain('bg-yellow-500');
  });

  test('aria-valuenow reflects actual usage percentage (near 0)', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    const valuenow = await progressBar.getAttribute('aria-valuenow');
    const pct = Number(valuenow);
    // Usage is 1016 bytes out of ~1GB quota (50% self-limit) → must be 0%
    expect(pct).toBe(0);
  });

  test('usage text shows correct byte count and percentage', async ({ page }) => {
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 5000 });

    // Text should show 1016 B and (0%)
    const pageText = await page.locator('[class*="tabular-nums"]').textContent();
    expect(pageText).toContain('1016 B');
    expect(pageText).toContain('0%');
  });
});

// ─── Suite 2: High usage (approaching limit) ──────────────────────────────────

test.describe('Settings — storage at 85% usage (warning state)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    await page.addInitScript(() => {
      const quota = 2 * 1024 * 1024 * 1024;
      // 85% of self-limit (50% of quota) → approaching limit
      const usage = Math.floor(quota * 0.5 * 0.85);

      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: () => Promise.resolve({ quota, usage }),
          persist: () => Promise.resolve(true),
          persisted: () => Promise.resolve(false),
        },
        writable: true,
        configurable: true,
      });
    });

    await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });
  });

  test('progress bar indicator reaches ~85% width at 85% usage', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    const indicatorTransform = await progressBar.evaluate((el) => {
      const indicator = el.firstElementChild as HTMLElement;
      return indicator?.style.transform ?? '';
    });

    // At 85%, translateX should be around -15%
    expect(indicatorTransform).toMatch(/translateX\(-1[0-9]%\)/);
  });

  test('aria-valuenow is around 85 at 85% usage', async ({ page }) => {
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    const pct = Number(await progressBar.getAttribute('aria-valuenow'));
    expect(pct).toBeGreaterThanOrEqual(80);
    expect(pct).toBeLessThanOrEqual(90);
  });
});

// ─── Suite 3: Screenshot regression ──────────────────────────────────────────

test.describe('Settings — storage visual screenshot', () => {
  test('settings page screenshot matches baseline (no full-blue bar bug)', async ({
    page,
  }) => {
    await login(page);

    await page.addInitScript(() => {
      const quota = 2 * 1024 * 1024 * 1024;
      const usage = 1016;
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: () => Promise.resolve({ quota, usage }),
          persist: () => Promise.resolve(true),
          persisted: () => Promise.resolve(false),
        },
        writable: true,
        configurable: true,
      });
    });

    await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 5000 });

    // Screenshot the storage card only
    const storageCard = page
      .locator('[role="progressbar"]')
      .locator('..')
      .locator('..');

    await expect(storageCard).toHaveScreenshot('storage-progress-bar-empty.png', {
      threshold: 0.05,
    });
  });
});

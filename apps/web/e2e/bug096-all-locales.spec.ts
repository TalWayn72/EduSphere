/**
 * BUG-096: All-locales smoke test — verifies dir/lang attributes and visual
 * regression for each supported locale.
 *
 * For each locale (he, es, fr, zh-CN):
 *   1. Sets the locale via localStorage before app boot
 *   2. Logs in and navigates to dashboard
 *   3. Asserts document.documentElement.dir matches expected (rtl for he, ltr for others)
 *   4. Asserts document.documentElement.lang matches the locale code
 *   5. Takes a screenshot for visual regression tracking
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, IS_DEV_MODE } from './env';

// ─── Locale test matrix ─────────────────────────────────────────────────────

interface LocaleTestCase {
  locale: string;
  expectedDir: 'rtl' | 'ltr';
  label: string;
}

const LOCALE_TEST_CASES: LocaleTestCase[] = [
  { locale: 'he', expectedDir: 'rtl', label: 'Hebrew' },
  { locale: 'es', expectedDir: 'ltr', label: 'Spanish' },
  { locale: 'fr', expectedDir: 'ltr', label: 'French' },
  { locale: 'zh-CN', expectedDir: 'ltr', label: 'Chinese Simplified' },
];

// ─── Login helper with locale injection ─────────────────────────────────────

async function loginWithLocale(
  page: import('@playwright/test').Page,
  locale: string
) {
  await page.addInitScript((loc: string) => {
    localStorage.setItem('edusphere_locale', loc);
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  }, locale);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  const devBtn = page.getByTestId('dev-login-btn');
  await devBtn.waitFor({ timeout: 10_000 });
  await devBtn.click();
  await page
    .waitForURL((url) => !url.toString().includes('/login'), {
      timeout: 20_000,
    })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

// ─── Parameterized tests ────────────────────────────────────────────────────

test.describe('BUG-096: All-locales smoke test', () => {
  test.skip(!IS_DEV_MODE, 'Dev-mode login tests require VITE_DEV_MODE=true');

  for (const { locale, expectedDir, label } of LOCALE_TEST_CASES) {
    test.describe(`${label} (${locale})`, () => {
      test.describe.configure({ timeout: 60_000 });

      test(`document dir is "${expectedDir}" for ${locale}`, async ({
        page,
      }) => {
        await loginWithLocale(page, locale);
        await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForLoadState('networkidle').catch(() => {});

        const dir = await page.evaluate(() => document.documentElement.dir);
        expect(dir).toBe(expectedDir);
      });

      test(`document lang is "${locale}" for ${label}`, async ({ page }) => {
        await loginWithLocale(page, locale);
        await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForLoadState('networkidle').catch(() => {});

        const lang = await page.evaluate(() => document.documentElement.lang);
        // lang attribute may be the full locale code or the base language
        // e.g. 'zh-CN' or 'zh', 'he' or 'he-IL'
        expect(lang).toContain(locale.split('-')[0]);
      });

      test(`visual regression screenshot for ${locale}`, async ({ page }) => {
        await loginWithLocale(page, locale);
        await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Wait for layout to settle
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot(`bug096-dashboard-${locale}.png`, {
          maxDiffPixelRatio: 0.05,
          fullPage: false,
        });
      });
    });
  }
});

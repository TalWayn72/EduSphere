import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

/**
 * i18n Smoke Guard — Catches raw i18n key display across all major pages.
 *
 * Regression guard for the translation-loading bug where 404s from broken
 * import paths caused raw keys like "language.title", "storage.clearCache"
 * to appear in the UI instead of translated text.
 *
 * Strategy:
 *   1. Visit every major page after login
 *   2. Extract all visible text from <body>
 *   3. Scan for patterns matching known i18n namespaces (e.g. "settings.title")
 *   4. Fail if any raw keys are found (filtering false positives)
 *   5. Repeat for Hebrew locale to verify RTL + translations
 */

// Known i18n namespaces from packages/i18n/src/locales/
const I18N_NAMESPACES = [
  'common',
  'nav',
  'auth',
  'dashboard',
  'courses',
  'content',
  'annotations',
  'agents',
  'collaboration',
  'knowledge',
  'settings',
  'errors',
  'offline',
  'admin',
  'srs',
];

// Pages to visit — covers all major routes
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/settings', name: 'settings' },
  { path: '/courses', name: 'courses' },
  { path: '/discover', name: 'discover' },
  { path: '/knowledge-graph', name: 'knowledge-graph' },
  { path: '/ai-tutor', name: 'ai-tutor' },
  { path: '/collaboration', name: 'collaboration' },
  { path: '/profile', name: 'profile' },
];

// False-positive patterns to ignore (URLs, file extensions, code, etc.)
const FALSE_POSITIVE_PATTERNS = [
  /https?:\/\//,
  /www\./,
  /\.js\b/,
  /\.ts\b/,
  /\.css\b/,
  /\.json\b/,
  /\.png\b/,
  /\.svg\b/,
  /\.html\b/,
  /\.com\b/,
  /\.io\b/,
  /\.dev\b/,
  /\.org\b/,
  /e\.g\./,
  /i\.e\./,
  /vs\./,
  /v\d+\.\d+/,  // version numbers like v2.0
  /\d+\.\d+/,   // decimal numbers like 3.14
];

/**
 * Assert that no raw i18n keys appear in the visible text of a page.
 *
 * Scans body text for patterns like "namespace.keyName" where namespace
 * matches one of the project's known i18n namespaces.
 */
async function assertNoRawI18nKeys(page: Page, pageName: string) {
  const bodyText = await page.locator('body').innerText();
  const allRawKeys: string[] = [];

  for (const ns of I18N_NAMESPACES) {
    // Match patterns like "settings.title" or "nav.home" or "errors.notFound.description"
    const pattern = new RegExp(`\\b${ns}\\.\\w+`, 'g');
    const matches = bodyText.match(pattern);
    if (matches) {
      // Filter out false positives
      const realKeys = matches.filter(
        (m) => !FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(m))
      );
      allRawKeys.push(...realKeys);
    }
  }

  expect(
    allRawKeys,
    `Raw i18n keys found on "${pageName}" page: ${allRawKeys.join(', ')}`
  ).toHaveLength(0);
}

// ── English locale smoke guard ───────────────────────────────────────────────

test.describe('i18n Smoke Guard — English (en)', () => {
  test.beforeEach(async ({ page }) => {
    // login() already sets edusphere_locale=en and sidebar collapsed
    await login(page);
  });

  for (const { path, name } of PAGES) {
    test(`no raw i18n keys on /${name} (en)`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      // Give translations time to load (lazy-loaded chunks)
      await page.waitForTimeout(1_000);

      await assertNoRawI18nKeys(page, name);

      await expect(page).toHaveScreenshot(`i18n-smoke-${name}-en.png`, {
        fullPage: false,
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    });
  }
});

// ── Hebrew locale smoke guard ────────────────────────────────────────────────

test.describe('i18n Smoke Guard — Hebrew (he)', () => {
  test.beforeEach(async ({ page }) => {
    // Override locale to Hebrew BEFORE app scripts run
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });

    // Login sets locale to 'en' via addInitScript — we need to re-set to 'he'
    // after login redirects. Use a route handler to ensure Hebrew is active.
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    await devBtn.waitFor({ timeout: 10_000 });
    await devBtn.click();
    await page
      .waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 20_000,
      })
      .catch(() => {
        // URL may already be on target route
      });
    await page.waitForLoadState('networkidle');

    // Force Hebrew locale after login
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
    });
  });

  for (const { path, name } of PAGES) {
    test(`no raw i18n keys on /${name} (he)`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      // Give translations time to load (lazy-loaded chunks)
      await page.waitForTimeout(1_000);

      await assertNoRawI18nKeys(page, name);
    });
  }

  test('document direction is RTL when Hebrew is active', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1_000);

    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');

    await expect(page).toHaveScreenshot('i18n-smoke-settings-he-rtl.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

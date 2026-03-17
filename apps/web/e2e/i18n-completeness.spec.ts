import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';

/**
 * i18n Completeness — Validates ALL supported locales across critical pages.
 *
 * For each locale defined in packages/i18n/src/index.ts (SUPPORTED_LOCALES),
 * visits 4 critical pages and verifies:
 *   1. No raw i18n keys visible (namespace.key patterns)
 *   2. Page heading is translated (body has non-empty text content)
 *   3. RTL locales have document.dir === 'rtl'
 *   4. Visual screenshot captured for regression tracking
 *
 * ~40 tests total (10 locales x 4 pages).
 */

// ── Known i18n namespaces (from packages/i18n/src/index.ts NAMESPACES) ──────

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

// ── Supported locales (from packages/i18n/src/index.ts SUPPORTED_LOCALES) ───

const LOCALES = [
  'en',
  'zh-CN',
  'hi',
  'es',
  'fr',
  'bn',
  'pt',
  'ru',
  'id',
  'he',
] as const;

// Hebrew is the only RTL locale in the project
const RTL_LOCALES = new Set(['he']);

// ── Critical pages to test ──────────────────────────────────────────────────

const PAGES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/settings', name: 'settings' },
  { path: '/courses', name: 'courses' },
  { path: '/profile', name: 'profile' },
];

// ── False-positive patterns (URLs, file extensions, version numbers, etc.) ──

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
  /v\d+\.\d+/, // version numbers like v2.0
  /\d+\.\d+/, // decimal numbers like 3.14
];

// ── Assertion helper ────────────────────────────────────────────────────────

/**
 * Scans visible body text for raw i18n keys matching known namespaces.
 * A raw key looks like "settings.title" or "nav.home" — meaning the
 * translation was not loaded and the key itself is rendered instead.
 */
async function assertNoRawI18nKeys(
  page: Page,
  pageName: string,
  locale: string
) {
  const bodyText = await page.locator('body').innerText();
  const allRawKeys: string[] = [];

  for (const ns of I18N_NAMESPACES) {
    const pattern = new RegExp(`\\b${ns}\\.\\w+`, 'g');
    const matches = bodyText.match(pattern);
    if (matches) {
      const realKeys = matches.filter(
        (m) => !FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(m))
      );
      allRawKeys.push(...realKeys);
    }
  }

  expect(
    allRawKeys,
    `Raw i18n keys on "${pageName}" (${locale}): ${allRawKeys.join(', ')}`
  ).toHaveLength(0);
}

// ── Test generation — one describe block per locale ─────────────────────────

for (const locale of LOCALES) {
  test.describe(`i18n Completeness — ${locale}`, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
      // Inject the target locale into localStorage BEFORE any app scripts run.
      // Also collapse the sidebar so the layout fits narrow viewports.
      await page.addInitScript(
        (loc) => {
          localStorage.setItem('edusphere_locale', loc);
          localStorage.setItem('edusphere-sidebar-collapsed', 'true');
        },
        locale
      );

      // Dev-mode login — click the dev login button
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: 'domcontentloaded',
      });
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

      // Re-set the locale after login (login may have overridden it)
      await page.evaluate(
        (loc) => {
          localStorage.setItem('edusphere_locale', loc);
        },
        locale
      );
    });

    for (const { path, name } of PAGES) {
      test(`no raw i18n keys on ${name} (${locale})`, async ({ page }) => {
        await page.goto(`${BASE_URL}${path}`, {
          waitUntil: 'networkidle',
        });
        // Allow lazy-loaded translation chunks to resolve
        await page.waitForTimeout(1_000);

        // 1. Assert no raw i18n keys are visible
        await assertNoRawI18nKeys(page, name, locale);

        // 2. Assert page has meaningful content (not blank)
        const bodyText = await page.locator('body').innerText();
        expect(
          bodyText.trim().length,
          `Page "${name}" (${locale}) should have visible text content`
        ).toBeGreaterThan(0);

        // 3. RTL check for Hebrew (and any future RTL locales)
        if (RTL_LOCALES.has(locale)) {
          const dir = await page.evaluate(
            () => document.documentElement.dir
          );
          expect(dir).toBe('rtl');
        }

        // 4. Visual regression screenshot
        await expect(page).toHaveScreenshot(
          `i18n-${locale}-${name}.png`,
          {
            fullPage: false,
            maxDiffPixels: 200,
            animations: 'disabled',
          }
        );
      });
    }
  });
}

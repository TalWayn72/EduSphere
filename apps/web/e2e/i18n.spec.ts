import { test, expect } from '@playwright/test';

/**
 * i18n E2E tests — internationalization feature (/settings).
 *
 * Auth: DEV_MODE (VITE_DEV_MODE=true) — ProtectedRoute passes through
 * automatically. No Keycloak login is required (matches smoke.spec.ts pattern).
 *
 * Source references verified before writing:
 *   - SettingsPage.tsx: renders <h1>{t('title')}</h1> and <LanguageSelector />
 *   - LanguageSelector.tsx: Radix Select (role="combobox"), lists LOCALE_LABELS
 *   - useUserPreferences.ts: setLocale() → localStorage.setItem('edusphere_locale', locale)
 *   - packages/i18n/src/index.ts: SUPPORTED_LOCALES (10 locales), LOCALE_LABELS, RTL_LOCALES
 *   - en/settings.json: title="Settings", language.title="Language"
 *   - es/settings.json: title="Configuración", language.description="Selecciona..."
 *
 * Requires: pnpm dev (port 5173, default baseURL in playwright.config.ts)
 */

// ── Group 1: Settings page navigation ────────────────────────────────────────

test.describe('i18n — Settings page navigation', () => {
  test.describe.configure({ mode: 'serial' });

  test('navigates to /settings and page loads without error', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/settings');
    // Layout wraps every page with a <header> (confirmed in smoke.spec.ts)
    await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });
  });

  test('settings page shows the Settings heading (en translation)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // SettingsPage: <h1>{t('title')}</h1>  en/settings.json → "Settings"
    await expect(
      page.getByRole('heading', { name: 'Settings' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('settings page shows the Language card title', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // CardTitle: t('language.title')  en → "Language"
    // .first() because the LanguageSelector label also reads "Language"
    await expect(page.getByText('Language').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Group 2: LanguageSelector presence and locale options ─────────────────────

test.describe('i18n — LanguageSelector presence and content', () => {
  test.describe.configure({ mode: 'serial' });

  test('Radix Select combobox trigger is visible on the settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // LanguageSelector uses shadcn/ui <Select> which renders role="combobox"
    await expect(page.getByRole('combobox').first()).toBeVisible({ timeout: 10_000 });
  });

  test('dropdown contains all 10 locales from SUPPORTED_LOCALES', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();

    // Radix SelectContent renders each SelectItem as role="option"
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 5_000 });
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('dropdown shows English native name', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();

    // LOCALE_LABELS['en'].native === 'English'
    await expect(
      page.getByRole('option', { name: /English/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('dropdown shows Español native name (es)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();

    // LOCALE_LABELS['es'].native === 'Español'
    await expect(
      page.getByRole('option', { name: /Espa/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('dropdown shows Français native name (fr)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();

    // LOCALE_LABELS['fr'].native === 'Français'
    await expect(
      page.getByRole('option', { name: /Fran/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('dropdown shows 中文 native name (zh-CN)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();

    // LOCALE_LABELS['zh-CN'].native === '中文'
    await expect(
      page.getByRole('option', { name: /中文/ }).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── Group 3: Language switching (functional) ──────────────────────────────────

test.describe('i18n — Language switching', () => {
  test.describe.configure({ mode: 'serial' });

  test('selecting Español switches the page heading to Configuración', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Confirm English is the active locale first
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10_000 });

    // Open the selector and pick Spanish
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();

    // es/settings.json: title → "Configuración"
    await expect(
      page.getByRole('heading', { name: /Configuraci/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('switching back to English restores the Settings heading', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // First switch to Spanish
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();
    await expect(page.getByRole('heading', { name: /Configuraci/i })).toBeVisible({ timeout: 10_000 });

    // Switch back to English
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /English/i }).first().click();

    // Allow locale JSON chunks to load (ViteLocaleBackend lazy-loads each locale)
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Settings' })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('description text updates to Spanish after locale switch', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();

    // Allow Spanish locale JSON chunk to load (ViteLocaleBackend lazy-loads each locale)
    await page.waitForLoadState('networkidle');

    // es/settings.json: language.description → "Selecciona tu idioma preferido..."
    // Two elements may render the same description text (different font-size variants)
    await expect(
      page.getByText(/Selecciona tu idioma preferido/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ── Group 4: Locale persistence in localStorage ───────────────────────────────

test.describe('i18n — Locale persistence in localStorage', () => {
  test.describe.configure({ mode: 'serial' });

  test('selecting a locale writes edusphere_locale to localStorage', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click selector and choose French
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Fran/i }).first().click();

    // useUserPreferences.setLocale() → localStorage.setItem('edusphere_locale', 'fr')
    const stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('fr');
  });

  test('locale in localStorage persists after full page reload', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Choose Portuguese via the live selector
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Portugu/i }).first().click();

    // Confirm it was written
    let stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('pt');

    // Hard reload — app re-reads localStorage on bootstrap
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Key should survive the reload unchanged
    stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('pt');
  });

  test('setLocale is optimistic: localStorage written before GraphQL resolves', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Choose Russian — useUserPreferences.setLocale() calls localStorage.setItem
    // synchronously before awaiting updatePreferences() (GraphQL mutation)
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Русский/ }).first().click();

    const stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('ru');
  });

  test('switching back to English updates localStorage to en', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Set Spanish first
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();
    let stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('es');

    // Switch back to English
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /English/i }).first().click();

    stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('en');
  });
});

// ── Group 5: Hebrew (RTL) locale ──────────────────────────────────────────────

test.describe('i18n — Hebrew RTL locale', () => {
  test.describe.configure({ mode: 'serial' });

  test('dropdown shows עברית native name (he)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();

    // LOCALE_LABELS['he'].native === 'עברית'
    await expect(
      page.getByRole('option', { name: /עברית/ }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('selecting Hebrew switches the page heading to הגדרות', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();

    // he/settings.json: title → "הגדרות"
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /הגדרות/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('selecting Hebrew sets document dir to rtl', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();

    // applyDocumentDirection('he') → document.documentElement.dir = 'rtl'
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
  });

  test('selecting Hebrew writes he to localStorage', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();

    const stored = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(stored).toBe('he');
  });

  test('switching from Hebrew back to English restores ltr direction', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Switch to Hebrew first
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    let dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');

    // Switch back to English
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /English/i }).first().click();
    await page.waitForLoadState('networkidle');

    dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('ltr');
  });
});

/**
 * Theme Settings — Phase 4 E2E tests
 *
 * Tests for ThemeSettingsPage rendered at /settings/theme.
 *
 * Phase 4 must:
 *   1. Add /settings/theme route to router.tsx
 *   2. Render ThemeSettingsPage at that route (already implemented in src/)
 *
 * Component selectors used (all come from ThemeSettingsPage.tsx):
 *   - data-testid="theme-mode-selector" — radiogroup containing Light/Dark/System
 *   - data-testid="font-size-selector"  — radiogroup for font size options
 *   - role="radio" name="theme-mode"    — individual radio inputs
 *   - h1 "Theme & Appearance Settings"  — page heading
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/theme-settings.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * Phase 4 will add /settings/theme to the router.
 * The ThemeSettingsPage component is already implemented in src/pages/.
 */
const THEME_ROUTE = '/settings/theme';

// ─── Suite 1: Page presence ───────────────────────────────────────────────────

test.describe('Theme Settings — page presence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${THEME_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
  });

  test('heading "Theme & Appearance Settings" is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Theme.*Appearance Settings/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('all 3 theme modes (Light, Dark, System) are present', async ({
    page,
  }) => {
    const selector = page.locator('[data-testid="theme-mode-selector"]');
    await expect(selector).toBeVisible({ timeout: 10_000 });

    // Light / Dark / System radio inputs with aria-label
    await expect(
      selector.getByRole('radio', { name: 'Light' })
    ).toBeAttached();
    await expect(
      selector.getByRole('radio', { name: 'Dark' })
    ).toBeAttached();
    await expect(
      selector.getByRole('radio', { name: 'System' })
    ).toBeAttached();
  });

  test('theme mode labels "Light", "Dark", "System" are visible', async ({
    page,
  }) => {
    await expect(page.getByText('Light')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Dark')).toBeVisible();
    await expect(page.getByText('System')).toBeVisible();
  });

  test('font size selector is present', async ({ page }) => {
    const selector = page.locator('[data-testid="font-size-selector"]');
    await expect(selector).toBeVisible({ timeout: 10_000 });
  });

  test('all 4 font size options are present', async ({ page }) => {
    const selector = page.locator('[data-testid="font-size-selector"]');
    await expect(selector).toBeVisible({ timeout: 10_000 });

    // FONT_SIZES: sm=Small, md=Medium, lg=Large, xl=Extra Large
    await expect(selector.getByRole('radio', { name: 'Small' })).toBeAttached();
    await expect(selector.getByRole('radio', { name: 'Medium' })).toBeAttached();
    await expect(selector.getByRole('radio', { name: 'Large' })).toBeAttached();
    await expect(selector.getByRole('radio', { name: 'Extra Large' })).toBeAttached();
  });
});

// ─── Suite 2: Theme switching ─────────────────────────────────────────────────

test.describe('Theme Settings — theme switching', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${THEME_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
  });

  test('clicking Dark theme radio reflects in DOM', async ({ page }) => {
    const darkRadio = page.getByRole('radio', { name: 'Dark' });
    await darkRadio.waitFor({ timeout: 10_000 });

    // Click the label (radio is visually hidden via sr-only)
    await page.locator('[data-testid="theme-mode-selector"] label').filter({ hasText: 'Dark' }).click();

    // The ThemeContext applies "dark" class to <html>
    // ThemeSettingsPage calls setThemeMode('dark') which updates context
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3_000 });
  });

  test('clicking Light theme radio reflects in DOM', async ({ page }) => {
    // First switch to dark so we have a state change to observe
    await page.locator('[data-testid="theme-mode-selector"] label').filter({ hasText: 'Dark' }).click();
    await page.waitForTimeout(200);

    await page.locator('[data-testid="theme-mode-selector"] label').filter({ hasText: 'Light' }).click();

    // In light mode the html element should NOT have the "dark" class
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 3_000 });
  });

  test('no raw technical error strings visible', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Error:');
  });
});

// ─── Suite 3: Visual regression ───────────────────────────────────────────────

test.describe('Theme Settings — visual regression @visual', () => {
  test.use({ reducedMotion: 'reduce' });

  test('visual regression — theme settings light mode', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${THEME_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });

    // Ensure Light theme is active for stable baseline
    const lightLabel = page
      .locator('[data-testid="theme-mode-selector"] label')
      .filter({ hasText: 'Light' });
    await lightLabel.waitFor({ timeout: 10_000 });
    await lightLabel.click();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('theme-settings-light.png', {
      fullPage: false,
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('visual regression — theme settings dark mode', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${THEME_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });

    // Switch to Dark
    const darkLabel = page
      .locator('[data-testid="theme-mode-selector"] label')
      .filter({ hasText: 'Dark' });
    await darkLabel.waitFor({ timeout: 10_000 });
    await darkLabel.click();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('theme-settings-dark.png', {
      fullPage: false,
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });
});

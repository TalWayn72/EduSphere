/**
 * BUG-065 Regression — Keycloak-dependent tests (Groups 1-3)
 *
 * Requires VITE_DEV_MODE=false and a running Keycloak instance.
 * All test groups skip automatically in DEV_MODE (standard CI).
 *
 * Split from language-save-regression.spec.ts to keep files under 300 lines.
 *
 * Run (staging):
 *   VITE_DEV_MODE=false E2E_BASE_URL=... \
 *   pnpm --filter @edusphere/web test:e2e --grep "language-save-regression"
 */

import { test, expect, type Page } from '@playwright/test';
import {
  BASE_URL,
  TEST_USERS,
  KEYCLOAK_REALM_URL,
  IS_DEV_MODE,
} from './env';

// ─── Auth helpers (Keycloak-only) ────────────────────────────────────────────

async function loginViaKeycloak(
  page: Page,
  email = TEST_USERS.superAdmin.email,
  password = TEST_USERS.superAdmin.password
): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 15_000 }
    )
    .catch(() => {});

  const signInBtn = page.getByRole('button', { name: /sign in with keycloak/i });
  await signInBtn.waitFor({ timeout: 10_000 });
  await signInBtn.click();

  await page.waitForURL(
    new RegExp(KEYCLOAK_REALM_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    { timeout: 20_000 }
  );
  await page.locator('#username').waitFor({ timeout: 10_000 });
  await page.fill('#username', email);
  await page.fill('#password', password);
  await page.click('#kc-login');

  const pat = BASE_URL.replace(/^https?:\/\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.waitForURL(new RegExp(pat), { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
  await page
    .waitForFunction(() => !document.body.textContent?.includes('Loading'), { timeout: 30_000 })
    .catch(() => {});
}

async function logoutViaUI(page: Page): Promise<void> {
  const userMenuBtn = page.getByRole('button', { name: 'User menu' });
  await userMenuBtn.waitFor({ timeout: 10_000 });
  await userMenuBtn.click();
  const logoutItem = page.getByRole('menuitem').last();
  await logoutItem.waitFor({ timeout: 5_000 });
  await logoutItem.click();
  await page.waitForURL(/\/(login)?$/, { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
}

// ─── Group 1: Success toast (no error toast) ──────────────────────────────────

test.describe('language-save-regression — success toast guard', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 });
  test.skip(IS_DEV_MODE, 'Requires live Keycloak (VITE_DEV_MODE=false)');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);
  });

  test('selecting Hebrew shows success toast, NOT error toast', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByText(/שמירת העדפות שפה נכשלה|language.*error|failed to save/i)
    ).not.toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(/העדפת השפה נשמרה/)).toBeVisible({ timeout: 10_000 });
  });

  test('error toast text absent after Spanish save', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByText('שמירת העדפות שפה נכשלה')
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('locale selector shows updated value immediately', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('combobox').first()).toContainText('עברית');
  });
});

// ─── Group 2: Keycloak logout → login persistence ─────────────────────────────

test.describe('language-save-regression — Keycloak logout/login persistence', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 });
  test.skip(IS_DEV_MODE, 'Requires live Keycloak (VITE_DEV_MODE=false)');

  test('locale persists through full Keycloak logout/login cycle', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/העדפת השפה נשמרה/)).toBeVisible({ timeout: 10_000 });

    await logoutViaUI(page);
    expect(await page.evaluate(() => localStorage.getItem('edusphere_locale'))).toBe('he');

    await loginViaKeycloak(page);
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /הגדרות/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('combobox').first()).toContainText('עברית');
    await expect(page.getByText('שמירת העדפות שפה נכשלה')).not.toBeVisible({ timeout: 3_000 });
  });

  test('login page uses persisted locale before re-authentication', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/ברוכים הבאים/)).toBeVisible({ timeout: 10_000 });
  });

  test('localStorage edusphere_locale is NOT cleared on logout', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Fran/i }).first().click();
    await page.waitForLoadState('domcontentloaded');
    expect(await page.evaluate(() => localStorage.getItem('edusphere_locale'))).toBe('fr');
    await logoutViaUI(page);
    expect(await page.evaluate(() => localStorage.getItem('edusphere_locale'))).toBe('fr');
  });
});

// ─── Group 3: Visual regression screenshots ───────────────────────────────────

test.describe('language-save-regression — visual regression', () => {
  test.use({ actionTimeout: 60_000 });
  test.skip(IS_DEV_MODE, 'Requires live Keycloak (VITE_DEV_MODE=false)');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);
  });

  test('settings page in Hebrew matches visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('heading', { name: /הגדרות/ }).waitFor({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('settings-page-hebrew.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

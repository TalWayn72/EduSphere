/**
 * BUG Regression: Language preference save failure
 *
 * Root cause (BUG-065): challenges.graphql imported "@requiresRole" from the
 * Federation v2.7 spec URL — an illegal import that crashed subgraph-core.
 * The gateway returned ECONNREFUSED → updateUserPreferences mutation always
 * failed → error toast "שמירת העדפות שפה נכשלה" shown on every language change.
 *
 * Fix: removed "@requiresRole" from the @link import in challenges.graphql.
 * "@requiresRole" is a LOCAL custom directive defined in user.graphql — it must
 * NOT appear in the Federation @link spec import list.
 *
 * This spec guards:
 *   1. Selecting Hebrew shows SUCCESS toast (not error toast)
 *   2. The Hebrew error string is NEVER visible (regression guard)
 *   3. Full Keycloak logout → login preserves the chosen locale
 *   4. Settings page shows the correct locale after re-login
 *
 * Prerequisites: VITE_DEV_MODE=false (real Keycloak + real subgraph-core)
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "language-save-regression"
 */

import { test, expect, type Page } from '@playwright/test';
import {
  BASE_URL,
  TEST_USERS,
  KEYCLOAK_REALM_URL,
} from './env';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  const appHostPattern = BASE_URL.replace(/^https?:\/\//, '').replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
  await page.waitForURL(new RegExp(appHostPattern), { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

async function logoutViaUI(page: Page): Promise<void> {
  // Open user menu and click logout (works in any language — uses role selector)
  const userMenuBtn = page.getByRole('button', { name: 'User menu' });
  await userMenuBtn.waitFor({ timeout: 10_000 });
  await userMenuBtn.click();

  // The logout item may be labeled "Logout", "יציאה", etc. — select by last menuitem
  const logoutItem = page.getByRole('menuitem').last();
  await logoutItem.waitFor({ timeout: 5_000 });
  await logoutItem.click();

  // Wait for redirect to landing page or login page
  await page.waitForURL(/\/(login)?$/, { timeout: 20_000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}

// ─── Group 1: Success toast (no error toast) ──────────────────────────────────

test.describe('language-save-regression — success toast guard', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Start with English locale so each test is isolated
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);
  });

  test('selecting Hebrew shows success toast, NOT error toast', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // BUG-065 regression: verify the error toast string is NEVER shown
    const errorToastLocator = page.getByText(/שמירת העדפות שפה נכשלה|language.*error|failed to save/i);

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();

    // Allow mutation to complete
    await page.waitForLoadState('networkidle');

    // REGRESSION GUARD: error toast must NOT appear
    await expect(errorToastLocator).not.toBeVisible({ timeout: 5_000 });

    // Success toast MUST appear
    // he/settings.json → language.saved = "העדפת השפה נשמרה"
    const successToast = page.getByText(/העדפת השפה נשמרה/);
    await expect(successToast).toBeVisible({ timeout: 10_000 });
  });

  test('BAD: error toast text is absent from the DOM after language save', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();
    await page.waitForLoadState('networkidle');

    // The specific error string from BUG-065 must never appear
    await expect(
      page.getByText('שמירת העדפות שפה נכשלה')
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('locale selector shows updated value immediately after save', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('networkidle');

    // Combobox should now show Hebrew flag + native name
    await expect(page.getByRole('combobox').first()).toContainText('עברית');
  });
});

// ─── Group 2: Keycloak logout → login locale persistence ─────────────────────

test.describe('language-save-regression — Keycloak logout/login persistence', () => {
  test.describe.configure({ mode: 'serial' });

  test('locale persists through full Keycloak logout/login cycle', async ({ page }) => {
    // Step 1: Start with English
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);

    // Step 2: Navigate to Settings and switch to Hebrew
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('networkidle');

    // Confirm success toast appeared (not error)
    await expect(page.getByText(/העדפת השפה נשמרה/)).toBeVisible({ timeout: 10_000 });

    // Step 3: Logout via Keycloak
    await logoutViaUI(page);

    // Step 4: Verify locale persisted in localStorage after logout
    // (login page should show Hebrew text if locale was preserved)
    const storedLocale = await page.evaluate(
      () => localStorage.getItem('edusphere_locale')
    );
    expect(storedLocale).toBe('he');

    // Step 5: Log back in
    await loginViaKeycloak(page);

    // Step 6: Navigate to Settings — locale must still be Hebrew
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // The heading must be in Hebrew, not English
    await expect(page.getByRole('heading', { name: /הגדרות/ })).toBeVisible({
      timeout: 10_000,
    });

    // Combobox must show Hebrew as selected
    await expect(page.getByRole('combobox').first()).toContainText('עברית');

    // REGRESSION GUARD: no error toast must appear on re-load
    await expect(
      page.getByText('שמירת העדפות שפה נכשלה')
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('login page UI uses persisted locale before re-authentication', async ({ page }) => {
    // Pre-set Hebrew locale (simulating a user who already saved Hebrew)
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Login page greeting must be in Hebrew
    // he/auth.json: welcome = "ברוכים הבאים ל-EduSphere"
    await expect(page.getByText(/ברוכים הבאים/)).toBeVisible({ timeout: 10_000 });
  });

  test('localStorage edusphere_locale is NOT cleared on logout', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);

    // Set locale to French
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Fran/i }).first().click();
    await page.waitForLoadState('networkidle');

    let stored = await page.evaluate(
      () => localStorage.getItem('edusphere_locale')
    );
    expect(stored).toBe('fr');

    // Logout
    await logoutViaUI(page);

    // Key MUST still be there (auth.logout() only clears sessionStorage in DEV_MODE;
    // in Keycloak mode it redirects without touching localStorage)
    stored = await page.evaluate(
      () => localStorage.getItem('edusphere_locale')
    );
    expect(stored).toBe('fr');
  });
});

// ─── Group 3: Visual regression screenshots ───────────────────────────────────

test.describe('language-save-regression — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await loginViaKeycloak(page);
  });

  test('settings page in Hebrew matches visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Switch to Hebrew
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForLoadState('networkidle');

    // Wait for Hebrew heading to confirm locale is active
    await page.getByRole('heading', { name: /הגדרות/ }).waitFor({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('settings-page-hebrew.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

/**
 * Language preference save — REAL E2E (no mocks)
 *
 * Prerequisites:
 *   - Frontend running at http://localhost:5173
 *   - GraphQL gateway running at http://localhost:4000/graphql
 *   - Services (Keycloak or DEV_MODE) running
 *
 * NO page.route(), NO mocked GraphQL, NO intercepted responses.
 * Every request hits the real running services.
 *
 * Route: /admin/languages
 * Mutation: UpdateTenantLanguageSettings
 * Success indicator: inline "Language settings saved" (CheckCircle2)
 * Error indicator: "Failed to save language settings. Please try again."
 *
 * Run:
 *   npx playwright test apps/web/e2e/language-save-real-e2e.spec.ts \
 *     --reporter=line --timeout=60000
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';

// Success / error text from packages/i18n/src/locales/en/settings.json
const SUCCESS_TEXT = 'Language settings saved';
const ERROR_TEXT = 'Failed to save language settings';

// Page heading from languageAdmin.title (English)
const PAGE_HEADING = 'Language Settings';

test.describe('Language preference save — REAL E2E (no mocks)', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  // ── Test 1: Save language preference via real services ──────────────────────
  test('save language preference via real services — success indicator appears', async ({
    page,
  }) => {
    // Step 1: Login (smart: detects DEV_MODE vs Keycloak)
    await login(page);

    // Step 2: Navigate to /admin/languages
    await page.goto(`${BASE_URL}/admin/languages`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for the page heading to confirm we landed on the right page
    // If role guard redirects to /dashboard, this will time out with a clear message
    await expect(page.getByRole('heading', { name: PAGE_HEADING })).toBeVisible(
      { timeout: 15_000 }
    );

    // Wait for the query to load (spinner disappears)
    await expect(
      page.getByText('Loading language settings...')
    ).not.toBeVisible({
      timeout: 15_000,
    });

    // Step 3: Change default language to Spanish (different from current 'en')
    // The <select> has all AVAILABLE_LOCALES as <option> elements
    const languageSelect = page.locator('select').first();
    await languageSelect.waitFor({ timeout: 10_000 });

    // Select Spanish — option value "es"
    await languageSelect.selectOption('es');

    // Step 4: Click "Save Changes"
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.waitFor({ timeout: 10_000 });
    await saveBtn.click();

    // Step 5: Verify SUCCESS indicator appears — NOT error
    // The component shows: <CheckCircle2> "Language settings saved"
    await expect(page.getByText(ERROR_TEXT)).not.toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(SUCCESS_TEXT)).toBeVisible({ timeout: 15_000 });

    // Step 6: Screenshot of success state
    await page.screenshot({
      path: 'docs/screenshots/language-save-real-e2e-success.png',
      fullPage: false,
    });

    // Step 7: Reset back to English so persistence check works
    await languageSelect.selectOption('en');
    await saveBtn.click();
    await expect(page.getByText(SUCCESS_TEXT)).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 2: Reload and verify preference persisted ──────────────────────────
  test('default language selection persists after page reload', async ({
    page,
  }) => {
    await login(page);

    await page.goto(`${BASE_URL}/admin/languages`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: PAGE_HEADING })).toBeVisible(
      { timeout: 15_000 }
    );
    await expect(
      page.getByText('Loading language settings...')
    ).not.toBeVisible({
      timeout: 15_000,
    });

    // Change default language to French
    const languageSelect = page.locator('select').first();
    await languageSelect.waitFor({ timeout: 10_000 });
    await languageSelect.selectOption('fr');

    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await saveBtn.click();
    await expect(page.getByText(SUCCESS_TEXT)).toBeVisible({ timeout: 15_000 });

    // Reload the page — data comes from real GraphQL query, no localStorage
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: PAGE_HEADING })).toBeVisible(
      { timeout: 15_000 }
    );
    await expect(
      page.getByText('Loading language settings...')
    ).not.toBeVisible({
      timeout: 15_000,
    });

    // After reload the select must show "fr" — persisted via GraphQL mutation
    const selectedValue = await page.locator('select').first().inputValue();
    expect(selectedValue).toBe('fr');

    // Screenshot of persisted state
    await page.screenshot({
      path: 'docs/screenshots/language-save-real-e2e-persisted.png',
      fullPage: false,
    });

    // Cleanup — reset to English
    await languageSelect.selectOption('en');
    await saveBtn.click();
    await expect(page.getByText(SUCCESS_TEXT)).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 3: Courses page loads without "server unavailable" banner ──────────
  test('courses page loads without server error banner', async ({ page }) => {
    await login(page);

    await page.goto(`${BASE_URL}/courses`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');
    // Wait for the page to settle
    await page.waitForTimeout(2_000);

    // Verify NO "server unavailable" banner (Hebrew or English variants)
    await expect(
      page.getByText(/השרת אינו זמין|server.*unavailable|cannot connect/i)
    ).not.toBeVisible({ timeout: 5_000 });

    // Screenshot
    await page.screenshot({
      path: 'docs/screenshots/language-save-real-e2e-courses.png',
      fullPage: false,
    });
  });
});

/**
 * BUG Regression: Language preference save failure (BUG-065)
 *
 * Root cause: challenges.graphql imported "@requiresRole" from the
 * Federation v2.7 spec URL — an illegal import that crashed subgraph-core.
 * The gateway returned ECONNREFUSED → updateUserPreferences mutation always
 * failed → error toast "שמירת העדפות שפה נכשלה" shown on every language change.
 *
 * Fix: removed "@requiresRole" from the @link import in challenges.graphql.
 *
 * CI compatibility (Gap 6 fix):
 *   - Removed hard VITE_DEV_MODE=false requirement.
 *   - Group 0 (this file): runs in ALL modes via routeGraphQL mock.
 *   - Groups 1-3 (Keycloak-dependent): language-save-regression.keycloak.spec.ts
 *     (skip in DEV_MODE automatically).
 *
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "language-save-regression"
 */

import { test, expect, type Page } from '@playwright/test';
import {
  BASE_URL,
  TEST_USERS,
  KEYCLOAK_REALM_URL,
  IS_DEV_MODE,
} from './env';
import { routeGraphQL } from './graphql-mock.helpers';
import { loginInDevMode } from './auth.helpers';

// ─── Keycloak helper (used only when IS_DEV_MODE=false) ──────────────────────

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
  await page.waitForURL(new RegExp(appHostPattern), { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes('Loading'),
      { timeout: 30_000 }
    )
    .catch(() => {});
}

// ─── Group 0: CI-compatible regression guard (ALL modes) ─────────────────────
//
// Catches BUG-065 regression in DEV_MODE + LIVE_BACKEND by using routeGraphQL
// to mock a successful mutation and verifying the error toast never fires.

test.describe('language-save-regression — ci-compatible mock guard', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    // Mock successful updateUserPreferences — no real backend required
    await routeGraphQL(page, (op) => {
      if (op === 'UpdateUserPreferences' || op === 'updateUserPreferences') {
        return JSON.stringify({
          data: {
            updateUserPreferences: {
              id: 'u1',
              preferences: {
                locale: 'he',
                theme: 'system',
                emailNotifications: true,
                pushNotifications: true,
                isPublicProfile: false,
              },
            },
          },
        });
      }
      return null;
    });
  });

  test('BUG-065 guard: error toast string absent after mocked-success save', async ({
    page,
  }) => {
    if (IS_DEV_MODE) {
      await loginInDevMode(page);
    } else {
      await loginViaKeycloak(page);
    }

    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /עברית/ }).first().click();
    await page.waitForTimeout(500);

    // THE REGRESSION GUARD: this exact Hebrew error string must NEVER appear
    await expect(
      page.getByText('שמירת העדפות שפה נכשלה')
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('BUG-065 guard: generic failed-to-save text also absent', async ({
    page,
  }) => {
    if (IS_DEV_MODE) {
      await loginInDevMode(page);
    } else {
      await loginViaKeycloak(page);
    }

    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /Espa/i }).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText(/שמירת העדפות שפה נכשלה|failed to save.*language/i)
    ).not.toBeVisible({ timeout: 5_000 });
  });
});

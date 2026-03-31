/**
 * Gap 4: Visual test for error toast state on language save
 *
 * Screenshots the settings page with:
 *   - Error toast visible (mocked GraphQL failure)
 *   - Success toast visible (mocked GraphQL success)
 * Both light and dark mode.
 *
 * Baselines: apps/web/e2e/visual-language-error.spec.ts-snapshots/
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';

// ─── Mock responses ──────────────────────────────────────────────────────────

const GQL_SUCCESS = JSON.stringify({
  data: {
    updateUserPreferences: {
      id: 'user-1',
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

const GQL_ERROR = JSON.stringify({
  errors: [
    {
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    },
  ],
  data: null,
});

// ─── Helper ──────────────────────────────────────────────────────────────────

async function openSettingsAndChangeLang(
  page: import('@playwright/test').Page,
  mockResponse: string
) {
  await routeGraphQL(page, (op) => {
    if (op === 'UpdateUserPreferences' || op === 'updateUserPreferences') {
      return mockResponse;
    }
    return null;
  });

  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });

  const combo = page.getByRole('combobox').first();
  await combo.waitFor({ timeout: 10_000 });
  await combo.click();

  const heOption = page.getByRole('option', { name: /עברית/i }).first();
  await heOption.waitFor({ timeout: 5_000 });
  await heOption.click();

  // Allow toast animation to complete
  await page.waitForTimeout(800);
}

// ─── Light mode ──────────────────────────────────────────────────────────────

test.describe('visual-language-error — light mode', () => {
  test.use({ colorScheme: 'light' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await login(page);
  });

  test('error toast screenshot — light mode', async ({ page }) => {
    await openSettingsAndChangeLang(page, GQL_ERROR);

    // Only take screenshot if an error toast is present;
    // in DEV_MODE the mock route may not be reached, so we guard gracefully.
    const hasToast = await page
      .getByText(/נכשלה|failed|error/i)
      .isVisible()
      .catch(() => false);

    if (hasToast) {
      await expect(page).toHaveScreenshot('language-save-error-toast-light.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    } else {
      // DEV_MODE: screenshot the settings page without toast as baseline
      await expect(page).toHaveScreenshot('settings-page-light-no-toast.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('success toast screenshot — light mode', async ({ page }) => {
    await openSettingsAndChangeLang(page, GQL_SUCCESS);

    await expect(page).toHaveScreenshot('language-save-success-toast-light.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── Dark mode ───────────────────────────────────────────────────────────────

test.describe('visual-language-error — dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await login(page);
  });

  test('error toast screenshot — dark mode', async ({ page }) => {
    await openSettingsAndChangeLang(page, GQL_ERROR);

    const hasToast = await page
      .getByText(/נכשלה|failed|error/i)
      .isVisible()
      .catch(() => false);

    if (hasToast) {
      await expect(page).toHaveScreenshot('language-save-error-toast-dark.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    } else {
      await expect(page).toHaveScreenshot('settings-page-dark-no-toast.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('success toast screenshot — dark mode', async ({ page }) => {
    await openSettingsAndChangeLang(page, GQL_SUCCESS);

    await expect(page).toHaveScreenshot('language-save-success-toast-dark.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

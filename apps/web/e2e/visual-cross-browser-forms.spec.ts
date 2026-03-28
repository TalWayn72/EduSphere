/**
 * visual-cross-browser-forms.spec.ts --- Cross-Browser Visual Regression for Form Pages
 *
 * Form-heavy pages tested across browsers with full form, input area, and submit button screenshots.
 * Validates consistent form rendering across Chromium, Firefox, and WebKit.
 *
 * Snapshots stored in: apps/web/e2e/visual-cross-browser-forms.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-cross-browser-forms --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-cross-browser-forms.spec.ts
 */

import { test, expect } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
import { BASE_URL } from './env';

const FORM_PAGES = [
  {
    name: 'login',
    path: '/login',
    formSelector: 'form, [data-testid="login-form"], main',
    inputSelector: 'input, [data-testid="login-inputs"]',
    submitSelector: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")',
  },
  {
    name: 'course-create',
    path: '/courses/create',
    formSelector: 'form, [data-testid="course-form"], main',
    inputSelector: 'form input, form textarea, form select',
    submitSelector: 'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
  },
  {
    name: 'settings',
    path: '/settings',
    formSelector: 'form, [data-testid="settings-form"], main',
    inputSelector: 'form input, form select, form textarea',
    submitSelector: 'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
  },
  {
    name: 'profile',
    path: '/profile',
    formSelector: 'form, [data-testid="profile-form"], main',
    inputSelector: 'form input, form textarea',
    submitSelector: 'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
  },
  {
    name: 'admin-settings',
    path: '/admin/settings',
    formSelector: 'form, [data-testid="admin-settings-form"], main',
    inputSelector: 'form input, form select, form textarea',
    submitSelector: 'button[type="submit"], button:has-text("Save"), button:has-text("Apply")',
  },
  {
    name: 'content-import',
    path: '/content-import',
    formSelector: 'form, [data-testid="import-form"], main',
    inputSelector: 'form input, form select, [data-testid="file-upload"]',
    submitSelector: 'button[type="submit"], button:has-text("Import"), button:has-text("Upload")',
  },
];

test.describe('Visual Cross-Browser -- Form Pages @visual @xbrowser @forms', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GraphQL to prevent backend dependency
    await page.route('**/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });
  });

  for (const { name, path, formSelector, inputSelector, submitSelector } of FORM_PAGES) {
    test(`${name} -- full form layout`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      const form = page.locator(formSelector).first();
      await expect(form).toHaveScreenshot(`xbrowser-form-${name}-full.png`, {
        animations: 'disabled' as const,
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`${name} -- input fields area`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      const inputs = page.locator(inputSelector).first();
      await expect(inputs).toHaveScreenshot(`xbrowser-form-${name}-inputs.png`, {
        animations: 'disabled' as const,
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`${name} -- submit button area`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      const submit = page.locator(submitSelector).first();
      await expect(submit).toHaveScreenshot(`xbrowser-form-${name}-submit.png`, {
        animations: 'disabled' as const,
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`${name} -- full page with form`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      await expect(page).toHaveScreenshot(`xbrowser-form-${name}-page.png`, {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    });

    test(`${name} -- focused input state`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {/* timeout ok */});
      const firstInput = page.locator(`${formSelector} input, ${formSelector} textarea`).first();
      await firstInput.focus().catch(() => {/* element may not exist */});
      await expect(page).toHaveScreenshot(`xbrowser-form-${name}-focused.png`, {
        ...LOOSE_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }
});

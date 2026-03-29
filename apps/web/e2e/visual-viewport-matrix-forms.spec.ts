/**
 * Visual Regression — Viewport Matrix: Form-Heavy Pages
 *
 * Tests form-heavy pages at 4 viewports (mobile, tablet, desktop, wide).
 * Each page gets full-page + form area + button/action bar screenshots per viewport.
 * Total: ~60 assertions.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-matrix-forms.spec.ts
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'wide', width: 1920, height: 1080 },
] as const;

const FORM_PAGES = [
  {
    path: '/courses/create',
    name: 'course-create',
    formSelector: 'form, [data-testid="course-form"], [data-testid="create-course-form"]',
    buttonSelector: 'button[type="submit"], [data-testid="submit-btn"], [data-testid="form-actions"]',
  },
  {
    path: '/content-import',
    name: 'content-import',
    formSelector: 'form, [data-testid="import-form"], [data-testid="content-import-form"]',
    buttonSelector: 'button[type="submit"], [data-testid="import-btn"], [data-testid="form-actions"]',
  },
  {
    path: '/admin/settings',
    name: 'admin-settings-form',
    formSelector: 'form, [data-testid="admin-settings-form"], [data-testid="settings-form"]',
    buttonSelector: 'button[type="submit"], [data-testid="save-btn"], [data-testid="form-actions"]',
  },
  {
    path: '/settings',
    name: 'user-settings-form',
    formSelector: 'form, [data-testid="user-settings-form"], [data-testid="settings-form"]',
    buttonSelector: 'button[type="submit"], [data-testid="save-btn"], [data-testid="form-actions"]',
  },
  {
    path: '/profile',
    name: 'profile-form',
    formSelector: 'form, [data-testid="profile-form"], [data-testid="profile-edit-form"]',
    buttonSelector: 'button[type="submit"], [data-testid="save-btn"], [data-testid="form-actions"]',
  },
] as const;

test.describe('Viewport Matrix — Form-Heavy Pages @visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
    await login(page);
  });

  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      for (const pg of FORM_PAGES) {
        test(`${pg.name} — full page`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(
            `vp-${vp.name}-${pg.name}-full.png`,
            { ...LOOSE_OPTS, mask: dynamicMasks(page) },
          );
        });

        test(`${pg.name} — form area`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const form = page.locator(pg.formSelector).first();
          if (await form.isVisible().catch(() => false)) {
            await expect(form).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-form.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });

        test(`${pg.name} — action buttons`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const buttons = page.locator(pg.buttonSelector).first();
          if (await buttons.isVisible().catch(() => false)) {
            await expect(buttons).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-buttons.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });
      }
    });
  }

  // === EXPANDED COVERAGE — Input focus states & validation ===
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} — form input states`, () => {
      test(`form input focus at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const input = page.locator('input[name="title"], input[name="name"], input').first();
        if (await input.isVisible().catch(() => false)) {
          await input.focus();
          await page.waitForTimeout(200);
        }
        await expect(page).toHaveScreenshot(
          `vp-${vp.name}-form-input-focus.png`,
          { ...LOOSE_OPTS, mask: dynamicMasks(page) },
        );
      });

      test(`form validation error at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(300);
        }
        await expect(page).toHaveScreenshot(
          `vp-${vp.name}-form-validation-errors.png`,
          { ...LOOSE_OPTS, mask: dynamicMasks(page) },
        );
      });

      test(`form header at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const header = page.locator('header, nav, [data-testid="page-header"]').first();
        if (await header.isVisible().catch(() => false)) {
          await expect(header).toHaveScreenshot(
            `vp-${vp.name}-form-page-header.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });
    });
  }
});

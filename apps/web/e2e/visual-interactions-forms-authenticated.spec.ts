/** Visual Interactions — Form States (Authenticated). Split from visual-interactions-forms.spec.ts (Part 2 of 2). */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function screenshotElement(
  page: import('@playwright/test').Page, selector: string, name: string, opts = STABLE_OPTS,
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

test.describe('Visual Interactions — Forms (Authenticated)', () => {
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

  // ─── Course creation form ────────────────────────────────────────────────

  test.describe('Course creation form', () => {
    test('empty form initial state', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-forms-course-create-empty.png', STABLE_OPTS);
    });

    test('title input focused', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const title = page.locator('input[name="title"], input[name="name"], [data-testid="course-title"]').first();
      if (await title.isVisible({ timeout: 3000 }).catch(() => false)) {
        await title.focus();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'form, [data-testid="course-form"], main', 'interact-forms-course-title-focused.png');
    });

    test('validation errors on empty submit', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const submitBtn = page.locator('button[type="submit"], [data-testid="submit-btn"], button:has-text("Create")').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveScreenshot('interact-forms-course-validation-errors.png', STABLE_OPTS);
    });

    test('description textarea focused', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const desc = page.locator('textarea[name="description"], [data-testid="course-description"]').first();
      if (await desc.isVisible({ timeout: 3000 }).catch(() => false)) {
        await desc.focus();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'form, [data-testid="course-form"], main', 'interact-forms-course-desc-focused.png');
    });

    test('category select open', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const select = page.locator('[data-testid="category-select"], select[name="category"], [role="combobox"]').first();
      if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
        await select.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="listbox"], [data-state="open"], select', 'interact-forms-course-category-open.png');
    });

    test('difficulty select open', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const select = page.locator('[data-testid="difficulty-select"], select[name="difficulty"], [role="combobox"]').nth(1);
      if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
        await select.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="listbox"], [data-state="open"]', 'interact-forms-course-difficulty-open.png');
    });

    test('form partially filled', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const title = page.locator('input[name="title"], input[name="name"], [data-testid="course-title"]').first();
      if (await title.isVisible({ timeout: 3000 }).catch(() => false)) {
        await title.fill('Introduction to Machine Learning');
      }
      const desc = page.locator('textarea[name="description"], [data-testid="course-description"]').first();
      if (await desc.isVisible({ timeout: 3000 }).catch(() => false)) {
        await desc.fill('A comprehensive course covering ML fundamentals.');
      }
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('interact-forms-course-partial-fill.png', STABLE_OPTS);
    });
  });

  // ─── Settings form ───────────────────────────────────────────────────────

  test.describe('Settings form', () => {
    test('settings page default state', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-forms-settings-default.png', STABLE_OPTS);
    });

    test('toggle switch off state', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[role="switch"], [data-testid="toggle"], input[type="checkbox"]', 'interact-forms-settings-toggle-off.png');
    });

    test('toggle switch on state', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const toggle = page.locator('[role="switch"], [data-testid="toggle"]').first();
      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="switch"], [data-testid="toggle"]', 'interact-forms-settings-toggle-on.png');
    });

    test('checkbox unchecked state', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, 'input[type="checkbox"], [role="checkbox"]', 'interact-forms-settings-checkbox-unchecked.png');
    });

    test('checkbox checked state', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkbox.click();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'input[type="checkbox"], [role="checkbox"]', 'interact-forms-settings-checkbox-checked.png');
    });

    test('radio button states', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const radio = page.locator('input[type="radio"], [role="radio"]').first();
      if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
        await radio.click();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, '[role="radiogroup"], fieldset', 'interact-forms-settings-radio-selected.png');
    });

    test('settings theme select open', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const themeSelect = page.locator('[data-testid="theme-select"], [aria-label*="theme"], [role="combobox"]').first();
      if (await themeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await themeSelect.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="listbox"], [data-state="open"]', 'interact-forms-settings-theme-open.png');
    });
  });

  // ─── Profile form ────────────────────────────────────────────────────────

  test.describe('Profile form', () => {
    test('profile page default state', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-forms-profile-default.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('profile name input focused', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const name = page.locator('input[name="name"], input[name="displayName"], [data-testid="profile-name"]').first();
      if (await name.isVisible({ timeout: 3000 }).catch(() => false)) {
        await name.focus();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'form, [data-testid="profile-form"], main', 'interact-forms-profile-name-focused.png');
    });

    test('profile bio textarea focused', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const bio = page.locator('textarea[name="bio"], [data-testid="profile-bio"]').first();
      if (await bio.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bio.focus();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, 'form, [data-testid="profile-form"], main', 'interact-forms-profile-bio-focused.png');
    });

    test('profile avatar upload area', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="avatar-upload"], [data-testid="file-upload"], input[type="file"]', 'interact-forms-profile-avatar-upload.png');
    });

    test('profile validation errors on empty name', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const name = page.locator('input[name="name"], input[name="displayName"], [data-testid="profile-name"]').first();
      if (await name.isVisible({ timeout: 3000 }).catch(() => false)) {
        await name.clear();
        await page.waitForTimeout(100);
      }
      const submitBtn = page.locator('button[type="submit"], [data-testid="save-profile"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveScreenshot('interact-forms-profile-validation-error.png', STABLE_OPTS);
    });

    test('profile date picker open', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const datePicker = page.locator('[data-testid="date-picker"], input[type="date"], [aria-label*="date"]').first();
      if (await datePicker.isVisible({ timeout: 3000 }).catch(() => false)) {
        await datePicker.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="dialog"], [data-testid="calendar"], .rdp', 'interact-forms-profile-datepicker-open.png');
    });
  });

  // ─── File upload states ──────────────────────────────────────────────────

  test.describe('File upload', () => {
    test('file upload area default', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="file-upload"], [data-testid="dropzone"], .dropzone', 'interact-forms-course-upload-default.png');
    });

    test('file upload drag hover simulation', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const dropzone = page.locator('[data-testid="file-upload"], [data-testid="dropzone"], .dropzone').first();
      if (await dropzone.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dropzone.dispatchEvent('dragenter');
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="file-upload"], [data-testid="dropzone"], .dropzone', 'interact-forms-course-upload-drag-hover.png');
    });
  });

  // ─── Toast/success feedback ──────────────────────────────────────────────

  test.describe('Form submission feedback', () => {
    test('success toast after form action', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button[type="submit"], [data-testid="save-btn"], button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
      await screenshotElement(page, '[data-testid="toast"], [role="alert"], [data-sonner-toast]', 'interact-forms-settings-success-toast.png');
    });

    test('error feedback on failed submission', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Validation failed' }] }),
        }),
      );
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button[type="submit"], [data-testid="save-btn"], button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveScreenshot('interact-forms-settings-error-feedback.png', STABLE_OPTS);
    });
  });
});

/**
 * visual-rtl-forms.spec.ts --- RTL Layout Visual Regression for Form Pages
 *
 * Screenshot-based visual regression for form-heavy pages in RTL (Hebrew) mode.
 * Validates form alignment, input text direction, label placement, button positioning,
 * and error message layout in right-to-left context.
 *
 * Snapshots stored in: apps/web/e2e/visual-rtl-forms.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-forms --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-forms.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.use({ locale: 'he' });

test.describe('Visual RTL -- Form Pages @visual @rtl', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
    await login(page);
  });

  // --- Course Create form ---

  test('course create -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-forms-course-create-full.png', STABLE_OPTS);
  });

  test('course create -- form fields RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const form = page.locator('form').first().or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('rtl-forms-course-create-fields.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-course-create-fields.png', {
        animations: 'disabled',
      });
    }
  });

  test('course create -- labels RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-forms-course-create-labels.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-course-create-labels.png', {
        animations: 'disabled',
      });
    }
  });

  test('course create -- submit buttons RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const buttonArea = page.locator('form').first().or(page.locator('main')).first();
    if (await buttonArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(buttonArea).toHaveScreenshot('rtl-forms-course-create-buttons.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-course-create-buttons.png', {
        animations: 'disabled',
      });
    }
  });

  test('course create -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-forms-course-create-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-course-create-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Settings page ---

  test('settings -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-forms-settings-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('settings -- form controls RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-forms-settings-controls.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-controls.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('settings -- toggle switches RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const form = page.locator('form').first().or(page.locator('main section')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('rtl-forms-settings-toggles.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-toggles.png', {
        animations: 'disabled',
      });
    }
  });

  test('settings -- save buttons RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('rtl-forms-settings-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-actions.png', {
        animations: 'disabled',
      });
    }
  });

  test('settings -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-forms-settings-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Profile edit ---

  test('profile -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-forms-profile-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('profile -- form inputs RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-forms-profile-inputs.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-profile-inputs.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- avatar section RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const avatarSection = page.locator('[data-testid="profile-avatar"]').or(page.locator('main section')).first();
    if (await avatarSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(avatarSection).toHaveScreenshot('rtl-forms-profile-avatar.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-profile-avatar.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- action buttons RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('rtl-forms-profile-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-profile-actions.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Admin Settings ---

  test('admin settings -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-forms-admin-settings-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('admin settings -- form fields RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-forms-admin-settings-fields.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-admin-settings-fields.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('admin settings -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-forms-admin-settings-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-admin-settings-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('admin settings -- action buttons RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('rtl-forms-admin-settings-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-admin-settings-actions.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Content Import ---

  test('content import -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/content-import`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-forms-content-import-full.png', STABLE_OPTS);
  });

  test('content import -- upload area RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/content-import`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-forms-content-import-upload.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-content-import-upload.png', {
        animations: 'disabled',
      });
    }
  });

  test('content import -- form controls RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/content-import`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const form = page.locator('form').first().or(page.locator('main section')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('rtl-forms-content-import-controls.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-content-import-controls.png', {
        animations: 'disabled',
      });
    }
  });

  test('content import -- action buttons RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/content-import`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('rtl-forms-content-import-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-content-import-actions.png', {
        animations: 'disabled',
      });
    }
  });

  test('content import -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/content-import`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-forms-content-import-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-content-import-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Additional form RTL checks ---

  test('settings -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-forms-settings-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  test('profile -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-forms-profile-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-profile-topbar.png', {
        animations: 'disabled',
      });
    }
  });
});

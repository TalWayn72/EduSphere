/**
 * visual-a11y-high-contrast.spec.ts --- Accessibility High Contrast Visual Regression
 *
 * Screenshot-based visual regression validating that all pages render correctly under
 * Windows High Contrast / forced-colors mode. WCAG 1.4.11 requires sufficient contrast
 * for non-text content, and forced-colors mode is the OS-level accessibility feature
 * users rely on for maximum readability.
 *
 * Snapshots stored in: apps/web/e2e/visual-a11y-high-contrast.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-a11y-high-contrast --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-a11y-high-contrast.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual A11y -- High Contrast Mode @visual @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  // --- Login page ---

  test('login -- full page high contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-login-full.png', STABLE_OPTS);
  });

  test('login -- form area high contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const form = page.locator('form').first().or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('a11y-contrast-login-form.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-login-form.png', {
        animations: 'disabled',
      });
    }
  });

  test('login -- header high contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('a11y-contrast-login-header.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-login-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('login -- buttons high contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-login-buttons.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-login-buttons.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Dashboard ---

  test('dashboard -- full page high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-dashboard-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('dashboard -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-dashboard-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-dashboard-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('dashboard -- main content high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-dashboard-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-dashboard-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard -- topbar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('a11y-contrast-dashboard-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-dashboard-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Courses ---

  test('courses -- full page high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-courses-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('courses -- course cards high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-courses-cards.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-courses-cards.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('courses -- search input high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const search = page.locator('input[type="search"]').or(page.locator('[data-testid="search-input"]')).first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(search).toHaveScreenshot('a11y-contrast-courses-search.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-courses-search.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Exams ---

  test('exams -- full page high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-exams-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('exams -- main content high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-exams-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-exams-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  // --- Profile ---

  test('profile -- full page high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-profile-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('profile -- form elements high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-profile-form.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-profile-form.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- action buttons high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('a11y-contrast-profile-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-profile-actions.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Additional high contrast checks ---

  test('exams -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-exams-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-exams-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('courses -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-courses-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-courses-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('dashboard -- buttons high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-dashboard-buttons.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-dashboard-buttons.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-profile-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-profile-sidebar.png', {
        animations: 'disabled',
      });
    }
  });
});

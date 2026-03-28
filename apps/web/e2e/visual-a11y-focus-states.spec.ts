/**
 * visual-a11y-focus-states.spec.ts --- Accessibility Focus Ring Visual Regression
 *
 * Screenshot-based visual regression validating that interactive elements show visible
 * focus rings when navigated via keyboard (Tab key). WCAG 2.4.7 requires visible
 * focus indicators for keyboard accessibility.
 *
 * Snapshots stored in: apps/web/e2e/visual-a11y-focus-states.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-a11y-focus-states --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-a11y-focus-states.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { STABLE_OPTS } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual A11y -- Focus States @visual @a11y', () => {
  // --- Login page focus rings ---

  test('login -- first focusable element has visible focus ring', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-login-first-tab.png', STABLE_OPTS);
  });

  test('login -- second tab stop has visible focus ring', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-login-second-tab.png', STABLE_OPTS);
  });

  test('login -- third tab stop has visible focus ring', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-login-third-tab.png', STABLE_OPTS);
  });

  test('login -- button focus ring visibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // Tab through to the sign-in button
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-login-button.png', STABLE_OPTS);
  });

  test('login -- link focus ring visibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // Tab to a link element
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-login-link.png', STABLE_OPTS);
  });

  // --- Dashboard focus rings (authenticated) ---

  test('dashboard -- sidebar nav item focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-dashboard-first-tab.png', {
      ...STABLE_OPTS,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('dashboard -- second nav element focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-dashboard-second-tab.png', {
      ...STABLE_OPTS,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('dashboard -- third interactive element focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-dashboard-third-tab.png', {
      ...STABLE_OPTS,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('dashboard -- button focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-dashboard-button.png', {
      ...STABLE_OPTS,
      maxDiffPixelRatio: 0.03,
    });
  });

  // --- Course Create form focus rings ---

  test('course create -- first form field focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-course-create-first-field.png', STABLE_OPTS);
  });

  test('course create -- second form field focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-course-create-second-field.png', STABLE_OPTS);
  });

  test('course create -- third form field focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-course-create-third-field.png', STABLE_OPTS);
  });

  test('course create -- submit button focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-course-create-submit.png', STABLE_OPTS);
  });

  // --- Search page focus rings ---

  test('search -- search input focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-search-input.png', STABLE_OPTS);
  });

  test('search -- filter button focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('a11y-focus-search-filter.png', STABLE_OPTS);
  });

  test('search -- third interactive element focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-search-third-element.png', STABLE_OPTS);
  });

  test('search -- fourth interactive element focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-search-fourth-element.png', STABLE_OPTS);
  });

  // --- Additional focus ring checks ---

  test('dashboard -- fifth interactive element focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-dashboard-sixth-tab.png', {
      ...STABLE_OPTS,
      maxDiffPixelRatio: 0.03,
    });
  });

  test('course create -- fourth form field focus ring', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-course-create-fourth-field.png', STABLE_OPTS);
  });

  test('login -- full page after tabbing to show focus state', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(page).toHaveScreenshot('a11y-focus-login-full-tabbed.png', STABLE_OPTS);
  });
});

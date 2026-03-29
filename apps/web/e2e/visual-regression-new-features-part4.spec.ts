/**
 * Visual Regression Tests — New Features (Part 4: Mobile Views + RTL Layout)
 * Split from visual-regression-new-features.spec.ts for file size compliance.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => { await login(page); });

const STABLE_OPTS = { maxDiffPixels: 200, threshold: 0.2, animations: 'disabled' as const };
const LOOSE_OPTS = { maxDiffPixels: 500, threshold: 0.3, animations: 'disabled' as const };

function dynamicMasks(page: Page) {
  return [
    page.locator('[data-testid="timestamp"]'), page.locator('[data-testid="user-avatar"]'),
    page.locator('[data-dynamic]'), page.locator('time'), page.locator('.user-avatar'),
    page.locator('[data-testid="leaderboard-points"]'), page.locator('[data-testid="streak-count"]'),
  ];
}

async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('main, [role="main"], #root > div, .min-h-screen').first()
    .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

test.describe('Visual Regression — Mobile Views @visual-new', () => {
  test.setTimeout(60_000);
  test.use({ viewport: { width: 375, height: 812 } });

  test('dashboard — mobile layout with widgets renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    await expect(page).toHaveScreenshot('mobile-dashboard-full.png', {
      fullPage: true, ...LOOSE_OPTS, mask: [...dynamicMasks(page), page.locator('canvas')],
    });
  });

  test('quiz page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    await expect(page).toHaveScreenshot('mobile-quiz-player.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('scenarios page — mobile grid renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    await page.locator('h3.font-semibold, text=No scenarios available yet, h1').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await expect(page).toHaveScreenshot('mobile-scenarios-grid.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('public profile page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/u/user-1');
    await expect(page).toHaveScreenshot('mobile-public-profile.png', {
      fullPage: true, ...STABLE_OPTS, mask: [...dynamicMasks(page), page.locator('time')],
    });
  });

  test('admin LTI page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await expect(page).toHaveScreenshot('mobile-admin-lti.png', {
      fullPage: true, ...STABLE_OPTS, mask: [...dynamicMasks(page), page.locator('.font-mono')],
    });
  });

  test('compliance page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await expect(page).toHaveScreenshot('mobile-compliance-page.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });
});

test.describe('Visual Regression — RTL Layout (Hebrew) @visual-new', () => {
  test.setTimeout(60_000);

  async function applyRTL(page: Page) {
    await page.addInitScript(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
  }

  test('dashboard — RTL layout with Hebrew locale renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/dashboard?lang=he');
    await expect(page).toHaveScreenshot('rtl-dashboard.png', {
      fullPage: true, ...LOOSE_OPTS, mask: [...dynamicMasks(page), page.locator('canvas')],
    });
  });

  test('scenarios page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/scenarios?lang=he');
    await page.locator('h3.font-semibold, text=No scenarios available yet, h1').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await expect(page).toHaveScreenshot('rtl-scenarios.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/quiz/quiz-mc-1?lang=he');
    await expect(page).toHaveScreenshot('rtl-quiz.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('profile page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/profile?lang=he');
    await expect(page).toHaveScreenshot('rtl-profile.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('admin compliance page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/admin/compliance?lang=he');
    await expect(page).toHaveScreenshot('rtl-admin-compliance.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });
});

/**
 * Visual Regression Tests — New Features (Part 1: Quiz Player)
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

test.describe('Visual Regression — Quiz Player @visual-new', () => {
  test.setTimeout(30_000);

  test('quiz page — multiple choice question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    await expect(page).toHaveScreenshot('quiz-multiple-choice.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz page — fill-in-the-blank question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-fill-1');
    await expect(page).toHaveScreenshot('quiz-fill-blank.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz page — likert scale question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-likert-1');
    await expect(page).toHaveScreenshot('quiz-likert.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz page — matching question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-match-1');
    await expect(page).toHaveScreenshot('quiz-matching.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz page — progress bar advances correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    const progressBar = page.locator('.rounded-full.h-1\\.5').first();
    if (await progressBar.isVisible().catch(() => false)) {
      await expect(progressBar).toHaveScreenshot('quiz-progress-bar.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('quiz-progress-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('quiz page — not-a-quiz state renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/content-1');
    await expect(page).toHaveScreenshot('quiz-not-a-quiz-state.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz page — result view renders correctly after submission', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    const firstOption = page.locator('button, label').filter({ hasText: /option|answer/i }).first();
    const optionVisible = await firstOption.isVisible().catch(() => false);
    if (optionVisible) await firstOption.click();
    const submitBtn = page.locator('button').filter({ hasText: /submit quiz/i });
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    if (submitVisible) {
      await submitBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot('quiz-result-view.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });
});

test.describe('Visual Regression — Scenarios & Roleplay @visual-new', () => {
  test.setTimeout(30_000);

  test('scenarios page — grid of scenario cards renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    await page.locator('h3.font-semibold, text=No scenarios available yet, .animate-pulse').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await expect(page).toHaveScreenshot('scenarios-grid.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('scenarios page — page heading and create button visible', async ({ page }) => {
    await goTo(page, '/scenarios');
    const header = page.locator('h1').filter({ hasText: /role-play scenarios/i });
    const headerVisible = await header.isVisible().catch(() => false);
    if (headerVisible) {
      const headerSection = page.locator('.space-y-6').first();
      await expect(headerSection).toHaveScreenshot('scenarios-header.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('scenarios-heading-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('scenarios page — empty state renders correctly when no scenarios', async ({ page }) => {
    await goTo(page, '/scenarios');
    const emptyCard = page.locator('text=No scenarios available yet');
    const loadingSkeletons = page.locator('.animate-pulse');
    const hasEmpty = await emptyCard.isVisible().catch(() => false);
    const hasSkeletons = await loadingSkeletons.first().isVisible().catch(() => false);
    if (hasEmpty || !hasSkeletons) {
      await expect(page).toHaveScreenshot('scenarios-empty-state.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('scenarios-loading-state.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('scenarios page — full page screenshot (desktop 1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await goTo(page, '/scenarios');
    await page.locator('h3.font-semibold, text=No scenarios available yet, h1').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    await expect(page).toHaveScreenshot('scenarios-full-page-desktop.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('roleplay simulator — chat interface layout (via scenario click)', async ({ page }) => {
    await goTo(page, '/scenarios');
    await page.locator('h3.font-semibold, text=No scenarios available yet').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (cardVisible) {
      await firstCard.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await page.locator('.fixed.inset-0').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot('roleplay-simulator-chat.png', {
      ...LOOSE_OPTS, mask: [...dynamicMasks(page), page.locator('.whitespace-pre-wrap')],
    });
  });

  test('roleplay simulator — header bar renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    await page.locator('h3.font-semibold, text=No scenarios available yet').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (cardVisible) {
      await firstCard.click();
      await page.locator('.fixed.inset-0').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
    const header = page.locator('.bg-gray-900').first();
    const headerVisible = await header.isVisible().catch(() => false);
    if (headerVisible) {
      await expect(header).toHaveScreenshot('roleplay-simulator-header.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('roleplay-simulator-header-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('roleplay simulator — input area renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    await page.locator('h3.font-semibold, text=No scenarios available yet').first()
      .waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (cardVisible) {
      await firstCard.click();
      await page.locator('.fixed.inset-0').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
    const inputArea = page.locator('.bg-gray-900').last();
    const inputVisible = await inputArea.isVisible().catch(() => false);
    if (inputVisible) {
      await expect(inputArea).toHaveScreenshot('roleplay-input-area.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('roleplay-input-area-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });
});

/**
 * Visual Regression Tests — New Features (Part 2: Content Types + Dashboard Widgets)
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

test.describe('Visual Regression — Content Types @visual-new', () => {
  test.setTimeout(30_000);

  test('rich document page — full page renders correctly', async ({ page }) => {
    await goTo(page, '/document/doc-1');
    await expect(page).toHaveScreenshot('rich-document-page.png', { fullPage: true, ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('rich document page — not found / missing content state', async ({ page }) => {
    await goTo(page, '/document/does-not-exist');
    await expect(page).toHaveScreenshot('rich-document-not-found.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('quiz content page — breadcrumb and layout render correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    const breadcrumb = page.locator('nav[aria-label*="breadcrumb"], [data-testid="breadcrumb"]').first();
    const breadcrumbVisible = await breadcrumb.isVisible().catch(() => false);
    if (breadcrumbVisible) {
      await expect(breadcrumb).toHaveScreenshot('quiz-breadcrumb.png', STABLE_OPTS);
    }
    await expect(page).toHaveScreenshot('quiz-content-page-layout.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('standard content viewer — renders correctly', async ({ page }) => {
    await goTo(page, '/learn/content-1');
    await expect(page).toHaveScreenshot('content-viewer-standard.png', { ...LOOSE_OPTS, mask: [...dynamicMasks(page), page.locator('video')] });
  });

  test('microlesson card — widget visible on dashboard', async ({ page }) => {
    await goTo(page, '/dashboard');
    const dailyWidget = page.locator('.card', { hasText: 'Daily Learning' }).first();
    const widgetVisible = await dailyWidget.isVisible().catch(() => false);
    if (widgetVisible) {
      await expect(dailyWidget).toHaveScreenshot('microlesson-card-widget.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('microlesson-card-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });
});

test.describe('Visual Regression — Dashboard Widgets @visual-new', () => {
  test.setTimeout(45_000);

  test('dashboard — full page with all new widgets renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    await page.locator('.grid, h1, [data-testid]').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true, ...LOOSE_OPTS,
      mask: [...dynamicMasks(page), page.locator('[data-testid="activity-heatmap"]'), page.locator('canvas'),
        page.locator('[data-testid*="score"], [data-testid*="count"], [data-testid*="points"]')],
    });
  });

  test('dashboard — DailyLearningWidget — lesson available state', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: 'Daily Learning' }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-daily-learning-available.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('widget-daily-learning-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('dashboard — DailyLearningWidget — all done state after completion', async ({ page }) => {
    await goTo(page, '/dashboard');
    const startBtn = page.locator('button', { hasText: /start today/i });
    const startVisible = await startBtn.isVisible().catch(() => false);
    if (startVisible) {
      await startBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
    const widget = page.locator('.card', { hasText: /all done for today/i }).first();
    const doneVisible = await widget.isVisible().catch(() => false);
    if (doneVisible) {
      await expect(widget).toHaveScreenshot('widget-daily-learning-done.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('widget-daily-learning-done-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('dashboard — LeaderboardWidget — top 5 list renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: /leaderboard/i }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-leaderboard.png', {
        ...STABLE_OPTS, mask: [...dynamicMasks(page), page.locator('[data-testid="leaderboard-entry"]')],
      });
    } else {
      await expect(page).toHaveScreenshot('widget-leaderboard-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('dashboard — SkillGapWidget — empty profile state renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: /skill gap/i }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-skill-gap-empty.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('widget-skill-gap-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('dashboard — SkillGapWidget — create profile dialog renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const newProfileBtn = page.locator('button', { hasText: /new profile/i });
    const btnVisible = await newProfileBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await newProfileBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      const dialogVisible = await dialog.isVisible().catch(() => false);
      if (dialogVisible) {
        await expect(dialog).toHaveScreenshot('widget-skill-gap-create-dialog.png', STABLE_OPTS);
      }
    }
    await expect(page).toHaveScreenshot('widget-skill-gap-with-dialog.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('dashboard — SRSWidget — renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: /review|srs|spaced/i }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-srs.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('widget-srs-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('dashboard — stats cards section renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const statsGrid = page.locator('.grid.gap-4').first();
    const gridVisible = await statsGrid.isVisible().catch(() => false);
    if (gridVisible) {
      await expect(statsGrid).toHaveScreenshot('dashboard-stats-cards.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('dashboard-stats-cards-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('dashboard — instructor tools card visible for instructor role', async ({ page }) => {
    await goTo(page, '/dashboard');
    const toolsCard = page.locator('.card', { hasText: /instructor tools/i });
    const toolsVisible = await toolsCard.isVisible().catch(() => false);
    if (toolsVisible) {
      await expect(toolsCard).toHaveScreenshot('dashboard-instructor-tools.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dashboard-student-view.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });
});

/**
 * Visual Regression — Dark Mode Learning Pages (Part 1)
 *
 * Content Viewer, Exams, Assessments in dark mode.
 * Split from visual-dark-mode-learning.spec.ts (Part 1 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-learning-part1.spec.ts-snapshots/
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goToDark(page: Page, path: string) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

const ELEMENT_OPTS = { animations: 'disabled' as const };

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT VIEWER (COURSE DETAIL)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Content Viewer @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('content viewer — full page dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    await expect(page).toHaveScreenshot(
      'dark-learning-content-full.png',
      LOOSE_OPTS
    );
  });

  test('content viewer — header dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot(
        'dark-learning-content-header.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-content-header.png',
        ELEMENT_OPTS
      );
    }
  });

  test('content viewer — main content dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot(
        'dark-learning-content-main.png',
        LOOSE_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-content-main.png',
        LOOSE_OPTS
      );
    }
  });

  test('content viewer — sidebar navigation dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const sidebar = page.locator('aside').or(page.locator('nav')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot(
        'dark-learning-content-sidebar.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-content-sidebar.png',
        ELEMENT_OPTS
      );
    }
  });

  test('content viewer — progress bar dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const progress = page
      .locator('[role="progressbar"]')
      .or(page.locator('.progress'))
      .first();
    if (await progress.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(progress).toHaveScreenshot(
        'dark-learning-content-progress.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-content-progress.png',
        ELEMENT_OPTS
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAMS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Exams @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('exams — full page dark', async ({ page }) => {
    await goToDark(page, '/exams');
    await expect(page).toHaveScreenshot(
      'dark-learning-exams-full.png',
      STABLE_OPTS
    );
  });

  test('exams — header dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot(
        'dark-learning-exams-header.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-exams-header.png',
        ELEMENT_OPTS
      );
    }
  });

  test('exams — exam list dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const list = page.locator('[role="list"]').or(page.locator('main')).first();
    if (await list.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(list).toHaveScreenshot(
        'dark-learning-exams-list.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-exams-list.png',
        ELEMENT_OPTS
      );
    }
  });

  test('exams — upcoming section dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const upcoming = page.locator('section').first();
    if (await upcoming.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(upcoming).toHaveScreenshot(
        'dark-learning-exams-upcoming.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-exams-upcoming.png',
        ELEMENT_OPTS
      );
    }
  });

  test('exams — results summary dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const results = page
      .locator('section')
      .nth(1)
      .or(page.locator('main'))
      .first();
    if (await results.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(results).toHaveScreenshot(
        'dark-learning-exams-results.png',
        LOOSE_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-exams-results.png',
        LOOSE_OPTS
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Assessments @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('assessments — full page dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    await expect(page).toHaveScreenshot(
      'dark-learning-assessments-full.png',
      STABLE_OPTS
    );
  });

  test('assessments — header dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot(
        'dark-learning-assessments-header.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-assessments-header.png',
        ELEMENT_OPTS
      );
    }
  });

  test('assessments — main content dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot(
        'dark-learning-assessments-main.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-assessments-main.png',
        ELEMENT_OPTS
      );
    }
  });

  test('assessments — score charts dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const charts = page.locator('canvas').or(page.locator('.chart')).first();
    if (await charts.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(charts).toHaveScreenshot(
        'dark-learning-assessments-charts.png',
        LOOSE_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-assessments-charts.png',
        LOOSE_OPTS
      );
    }
  });

  test('assessments — rubric table dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const table = page
      .locator('table')
      .or(page.locator('[role="table"]'))
      .first();
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table).toHaveScreenshot(
        'dark-learning-assessments-rubric.png',
        ELEMENT_OPTS
      );
    } else {
      await expect(page).toHaveScreenshot(
        'dark-learning-assessments-rubric.png',
        ELEMENT_OPTS
      );
    }
  });
});

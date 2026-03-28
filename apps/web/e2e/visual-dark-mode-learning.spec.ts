/**
 * Visual Regression — Dark Mode Learning Pages
 *
 * Screenshot-based visual regression for learning/student pages in dark mode.
 * Uses `page.emulateMedia({ colorScheme: 'dark' })` for system-level dark mode.
 * Auto-authenticated in DEV_MODE (VITE_DEV_MODE=true).
 *
 * Pages: /courses/1, /exams, /assessments, /social, /profile, /settings
 * ~30 assertions across 6 pages × 5 sections each.
 * Uses LOOSE_OPTS for pages with charts/dynamic content.
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-learning.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-learning --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-learning.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goToDark(page: Page, path: string) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT VIEWER (COURSE DETAIL)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Content Viewer @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('content viewer — full page dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    await expect(page).toHaveScreenshot('dark-learning-content-full.png', LOOSE_OPTS);
  });

  test('content viewer — header dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-learning-content-header.png', { animations: 'disabled' as const });
  });

  test('content viewer — main content dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-learning-content-main.png', LOOSE_OPTS);
  });

  test('content viewer — sidebar navigation dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const sidebar = page.locator('[data-testid="course-sidebar"], aside, nav').first();
    await expect(sidebar).toHaveScreenshot('dark-learning-content-sidebar.png', { animations: 'disabled' as const });
  });

  test('content viewer — progress bar dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const progress = page.locator('[data-testid="progress-bar"], [role="progressbar"], .progress').first();
    await expect(progress).toHaveScreenshot('dark-learning-content-progress.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAMS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Exams @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('exams — full page dark', async ({ page }) => {
    await goToDark(page, '/exams');
    await expect(page).toHaveScreenshot('dark-learning-exams-full.png', STABLE_OPTS);
  });

  test('exams — header dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-learning-exams-header.png', { animations: 'disabled' as const });
  });

  test('exams — exam list dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const list = page.locator('[data-testid="exam-list"], [role="list"], main').first();
    await expect(list).toHaveScreenshot('dark-learning-exams-list.png', { animations: 'disabled' as const });
  });

  test('exams — upcoming section dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const upcoming = page.locator('[data-testid="upcoming-exams"], .upcoming, section').first();
    await expect(upcoming).toHaveScreenshot('dark-learning-exams-upcoming.png', { animations: 'disabled' as const });
  });

  test('exams — results summary dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const results = page.locator('[data-testid="exam-results"], .results, section').first();
    await expect(results).toHaveScreenshot('dark-learning-exams-results.png', LOOSE_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Assessments @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('assessments — full page dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    await expect(page).toHaveScreenshot('dark-learning-assessments-full.png', STABLE_OPTS);
  });

  test('assessments — header dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-learning-assessments-header.png', { animations: 'disabled' as const });
  });

  test('assessments — main content dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-learning-assessments-main.png', { animations: 'disabled' as const });
  });

  test('assessments — score charts dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const charts = page.locator('[data-testid="score-charts"], .chart, canvas').first();
    await expect(charts).toHaveScreenshot('dark-learning-assessments-charts.png', LOOSE_OPTS);
  });

  test('assessments — rubric table dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const table = page.locator('[data-testid="rubric-table"], table, [role="table"]').first();
    await expect(table).toHaveScreenshot('dark-learning-assessments-rubric.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Social @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('social — full page dark', async ({ page }) => {
    await goToDark(page, '/social');
    await expect(page).toHaveScreenshot('dark-learning-social-full.png', STABLE_OPTS);
  });

  test('social — header dark', async ({ page }) => {
    await goToDark(page, '/social');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-learning-social-header.png', { animations: 'disabled' as const });
  });

  test('social — feed area dark', async ({ page }) => {
    await goToDark(page, '/social');
    const feed = page.locator('[data-testid="social-feed"], .feed, main').first();
    await expect(feed).toHaveScreenshot('dark-learning-social-feed.png', { animations: 'disabled' as const });
  });

  test('social — post composer dark', async ({ page }) => {
    await goToDark(page, '/social');
    const composer = page.locator('[data-testid="post-composer"], .composer, textarea').first();
    await expect(composer).toHaveScreenshot('dark-learning-social-composer.png', { animations: 'disabled' as const });
  });

  test('social — sidebar dark', async ({ page }) => {
    await goToDark(page, '/social');
    const sidebar = page.locator('[data-testid="social-sidebar"], aside, .sidebar').first();
    await expect(sidebar).toHaveScreenshot('dark-learning-social-sidebar.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Profile @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('profile — full page dark', async ({ page }) => {
    await goToDark(page, '/profile');
    await expect(page).toHaveScreenshot('dark-learning-profile-full.png', STABLE_OPTS);
  });

  test('profile — header dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-learning-profile-header.png', { animations: 'disabled' as const });
  });

  test('profile — avatar section dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const avatar = page.locator('[data-testid="profile-avatar"], .avatar, img').first();
    await expect(avatar).toHaveScreenshot('dark-learning-profile-avatar.png', { animations: 'disabled' as const });
  });

  test('profile — details form dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const form = page.locator('form, [data-testid="profile-form"], main').first();
    await expect(form).toHaveScreenshot('dark-learning-profile-form.png', { animations: 'disabled' as const });
  });

  test('profile — activity section dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const activity = page.locator('[data-testid="activity"], .activity, section').first();
    await expect(activity).toHaveScreenshot('dark-learning-profile-activity.png', LOOSE_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Settings @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('settings — full page dark', async ({ page }) => {
    await goToDark(page, '/settings');
    await expect(page).toHaveScreenshot('dark-learning-settings-full.png', STABLE_OPTS);
  });

  test('settings — header dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-learning-settings-header.png', { animations: 'disabled' as const });
  });

  test('settings — form controls dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const form = page.locator('form, [data-testid="settings-form"], main').first();
    await expect(form).toHaveScreenshot('dark-learning-settings-form.png', { animations: 'disabled' as const });
  });

  test('settings — theme toggle dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const toggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, [role="switch"]').first();
    await expect(toggle).toHaveScreenshot('dark-learning-settings-theme.png', { animations: 'disabled' as const });
  });

  test('settings — notification preferences dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const notifs = page.locator('[data-testid="notification-prefs"], .notification-settings, section').first();
    await expect(notifs).toHaveScreenshot('dark-learning-settings-notifications.png', { animations: 'disabled' as const });
  });
});

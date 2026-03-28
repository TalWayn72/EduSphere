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
  test.setTimeout(30_000);

  test('content viewer — full page dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    await expect(page).toHaveScreenshot('dark-learning-content-full.png', LOOSE_OPTS);
  });

  test('content viewer — header dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-content-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-content-header.png', ELEMENT_OPTS);
    }
  });

  test('content viewer — main content dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-learning-content-main.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-content-main.png', LOOSE_OPTS);
    }
  });

  test('content viewer — sidebar navigation dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const sidebar = page.locator('aside').or(page.locator('nav')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-learning-content-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-content-sidebar.png', ELEMENT_OPTS);
    }
  });

  test('content viewer — progress bar dark', async ({ page }) => {
    await goToDark(page, '/courses/1');
    const progress = page.locator('[role="progressbar"]').or(page.locator('.progress')).first();
    if (await progress.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(progress).toHaveScreenshot('dark-learning-content-progress.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-content-progress.png', ELEMENT_OPTS);
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
  test.setTimeout(30_000);

  test('exams — full page dark', async ({ page }) => {
    await goToDark(page, '/exams');
    await expect(page).toHaveScreenshot('dark-learning-exams-full.png', STABLE_OPTS);
  });

  test('exams — header dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-exams-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-exams-header.png', ELEMENT_OPTS);
    }
  });

  test('exams — exam list dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const list = page.locator('[role="list"]').or(page.locator('main')).first();
    if (await list.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(list).toHaveScreenshot('dark-learning-exams-list.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-exams-list.png', ELEMENT_OPTS);
    }
  });

  test('exams — upcoming section dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const upcoming = page.locator('section').first();
    if (await upcoming.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(upcoming).toHaveScreenshot('dark-learning-exams-upcoming.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-exams-upcoming.png', ELEMENT_OPTS);
    }
  });

  test('exams — results summary dark', async ({ page }) => {
    await goToDark(page, '/exams');
    const results = page.locator('section').nth(1).or(page.locator('main')).first();
    if (await results.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(results).toHaveScreenshot('dark-learning-exams-results.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-exams-results.png', LOOSE_OPTS);
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
  test.setTimeout(30_000);

  test('assessments — full page dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    await expect(page).toHaveScreenshot('dark-learning-assessments-full.png', STABLE_OPTS);
  });

  test('assessments — header dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-assessments-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-assessments-header.png', ELEMENT_OPTS);
    }
  });

  test('assessments — main content dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-learning-assessments-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-assessments-main.png', ELEMENT_OPTS);
    }
  });

  test('assessments — score charts dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const charts = page.locator('canvas').or(page.locator('.chart')).first();
    if (await charts.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(charts).toHaveScreenshot('dark-learning-assessments-charts.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-assessments-charts.png', LOOSE_OPTS);
    }
  });

  test('assessments — rubric table dark', async ({ page }) => {
    await goToDark(page, '/assessments');
    const table = page.locator('table').or(page.locator('[role="table"]')).first();
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table).toHaveScreenshot('dark-learning-assessments-rubric.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-assessments-rubric.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-social-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-header.png', ELEMENT_OPTS);
    }
  });

  test('social — feed area dark', async ({ page }) => {
    await goToDark(page, '/social');
    const feed = page.locator('.feed').or(page.locator('main')).first();
    if (await feed.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(feed).toHaveScreenshot('dark-learning-social-feed.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-feed.png', ELEMENT_OPTS);
    }
  });

  test('social — post composer dark', async ({ page }) => {
    await goToDark(page, '/social');
    const composer = page.locator('textarea').or(page.locator('.composer')).first();
    if (await composer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(composer).toHaveScreenshot('dark-learning-social-composer.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-composer.png', ELEMENT_OPTS);
    }
  });

  test('social — sidebar dark', async ({ page }) => {
    await goToDark(page, '/social');
    const sidebar = page.locator('aside').or(page.locator('.sidebar')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-learning-social-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-sidebar.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-profile-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-header.png', ELEMENT_OPTS);
    }
  });

  test('profile — avatar section dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const avatar = page.locator('.avatar').or(page.locator('img')).first();
    if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(avatar).toHaveScreenshot('dark-learning-profile-avatar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-avatar.png', ELEMENT_OPTS);
    }
  });

  test('profile — details form dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-learning-profile-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-form.png', ELEMENT_OPTS);
    }
  });

  test('profile — activity section dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const activity = page.locator('.activity').or(page.locator('section')).first();
    if (await activity.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activity).toHaveScreenshot('dark-learning-profile-activity.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-activity.png', LOOSE_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-settings-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-header.png', ELEMENT_OPTS);
    }
  });

  test('settings — form controls dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-learning-settings-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-form.png', ELEMENT_OPTS);
    }
  });

  test('settings — theme toggle dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const toggle = page.locator('[role="switch"]').or(page.locator('.theme-toggle')).first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toggle).toHaveScreenshot('dark-learning-settings-theme.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-theme.png', ELEMENT_OPTS);
    }
  });

  test('settings — notification preferences dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const notifs = page.locator('.notification-settings').or(page.locator('section')).first();
    if (await notifs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(notifs).toHaveScreenshot('dark-learning-settings-notifications.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-notifications.png', ELEMENT_OPTS);
    }
  });
});

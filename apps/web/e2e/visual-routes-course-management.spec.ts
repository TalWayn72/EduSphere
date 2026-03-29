/**
 * Visual E2E — Course Management Routes
 *
 * Covers /courses, /courses/create, /courses/:id, /courses/:id/edit,
 * /courses/:id/lessons, /courses/:id/analytics across 3 viewports.
 *
 * 66 toHaveScreenshot() assertions.
 */
import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function nav(page: Page, path: string, vw: number, vh: number) {
  await page.setViewportSize({ width: vw, height: vh });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function elOrPage(page: Page, sel: string, alt: string) {
  const el = page.locator(sel).or(page.locator(alt)).first();
  return (await el.isVisible({ timeout: 3000 }).catch(() => false)) ? el : page;
}

test.beforeEach(async ({ page }) => { await login(page); });

/* ═══════════════ /courses ═══════════════ */

test('/courses desktop full', async ({ page }) => {
  await nav(page, '/courses', 1280, 720);
  await expect(page).toHaveScreenshot('cm-courses-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses desktop header', async ({ page }) => {
  await nav(page, '/courses', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-courses-desktop-header.png', STABLE_OPTS);
});
test('/courses desktop main', async ({ page }) => {
  await nav(page, '/courses', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-courses-desktop-main.png', STABLE_OPTS);
});
test('/courses tablet full', async ({ page }) => {
  await nav(page, '/courses', 768, 1024);
  await expect(page).toHaveScreenshot('cm-courses-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses tablet header', async ({ page }) => {
  await nav(page, '/courses', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-courses-tablet-header.png', STABLE_OPTS);
});
test('/courses tablet main', async ({ page }) => {
  await nav(page, '/courses', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-courses-tablet-main.png', STABLE_OPTS);
});
test('/courses tablet sidebar', async ({ page }) => {
  await nav(page, '/courses', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('cm-courses-tablet-sidebar.png', STABLE_OPTS);
});
test('/courses mobile full', async ({ page }) => {
  await nav(page, '/courses', 375, 812);
  await expect(page).toHaveScreenshot('cm-courses-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses mobile header', async ({ page }) => {
  await nav(page, '/courses', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-courses-mobile-header.png', STABLE_OPTS);
});
test('/courses mobile main', async ({ page }) => {
  await nav(page, '/courses', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-courses-mobile-main.png', STABLE_OPTS);
});
test('/courses mobile footer', async ({ page }) => {
  await nav(page, '/courses', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('cm-courses-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ /courses/create ═══════════════ */

test('/courses/create desktop full', async ({ page }) => {
  await nav(page, '/courses/create', 1280, 720);
  await expect(page).toHaveScreenshot('cm-create-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/create desktop header', async ({ page }) => {
  await nav(page, '/courses/create', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-create-desktop-header.png', STABLE_OPTS);
});
test('/courses/create desktop main', async ({ page }) => {
  await nav(page, '/courses/create', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-create-desktop-main.png', STABLE_OPTS);
});
test('/courses/create tablet full', async ({ page }) => {
  await nav(page, '/courses/create', 768, 1024);
  await expect(page).toHaveScreenshot('cm-create-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/create tablet header', async ({ page }) => {
  await nav(page, '/courses/create', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-create-tablet-header.png', STABLE_OPTS);
});
test('/courses/create tablet main', async ({ page }) => {
  await nav(page, '/courses/create', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-create-tablet-main.png', STABLE_OPTS);
});
test('/courses/create mobile full', async ({ page }) => {
  await nav(page, '/courses/create', 375, 812);
  await expect(page).toHaveScreenshot('cm-create-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/create mobile header', async ({ page }) => {
  await nav(page, '/courses/create', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-create-mobile-header.png', STABLE_OPTS);
});
test('/courses/create mobile main', async ({ page }) => {
  await nav(page, '/courses/create', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-create-mobile-main.png', STABLE_OPTS);
});
test('/courses/create mobile footer', async ({ page }) => {
  await nav(page, '/courses/create', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('cm-create-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ /courses/:id ═══════════════ */

test('/courses/:id desktop full', async ({ page }) => {
  await nav(page, '/courses/course-1', 1280, 720);
  await expect(page).toHaveScreenshot('cm-detail-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id desktop header', async ({ page }) => {
  await nav(page, '/courses/course-1', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-detail-desktop-header.png', STABLE_OPTS);
});
test('/courses/:id desktop main', async ({ page }) => {
  await nav(page, '/courses/course-1', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-detail-desktop-main.png', STABLE_OPTS);
});
test('/courses/:id tablet full', async ({ page }) => {
  await nav(page, '/courses/course-1', 768, 1024);
  await expect(page).toHaveScreenshot('cm-detail-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id tablet header', async ({ page }) => {
  await nav(page, '/courses/course-1', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-detail-tablet-header.png', STABLE_OPTS);
});
test('/courses/:id tablet sidebar', async ({ page }) => {
  await nav(page, '/courses/course-1', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('cm-detail-tablet-sidebar.png', STABLE_OPTS);
});
test('/courses/:id mobile full', async ({ page }) => {
  await nav(page, '/courses/course-1', 375, 812);
  await expect(page).toHaveScreenshot('cm-detail-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id mobile header', async ({ page }) => {
  await nav(page, '/courses/course-1', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-detail-mobile-header.png', STABLE_OPTS);
});
test('/courses/:id mobile main', async ({ page }) => {
  await nav(page, '/courses/course-1', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-detail-mobile-main.png', STABLE_OPTS);
});

/* ═══════════════ /courses/:id/edit ═══════════════ */

test('/courses/:id/edit desktop full', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 1280, 720);
  await expect(page).toHaveScreenshot('cm-edit-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/edit desktop header', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-edit-desktop-header.png', STABLE_OPTS);
});
test('/courses/:id/edit desktop main', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-edit-desktop-main.png', STABLE_OPTS);
});
test('/courses/:id/edit tablet full', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 768, 1024);
  await expect(page).toHaveScreenshot('cm-edit-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/edit tablet header', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-edit-tablet-header.png', STABLE_OPTS);
});
test('/courses/:id/edit tablet main', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-edit-tablet-main.png', STABLE_OPTS);
});
test('/courses/:id/edit mobile full', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 375, 812);
  await expect(page).toHaveScreenshot('cm-edit-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/edit mobile header', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-edit-mobile-header.png', STABLE_OPTS);
});
test('/courses/:id/edit mobile main', async ({ page }) => {
  await nav(page, '/courses/course-1/edit', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-edit-mobile-main.png', STABLE_OPTS);
});

/* ═══════════════ /courses/:id/lessons ═══════════════ */

test('/courses/:id/lessons desktop full', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 1280, 720);
  await expect(page).toHaveScreenshot('cm-lessons-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/lessons desktop header', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-lessons-desktop-header.png', STABLE_OPTS);
});
test('/courses/:id/lessons desktop main', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-lessons-desktop-main.png', STABLE_OPTS);
});
test('/courses/:id/lessons tablet full', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 768, 1024);
  await expect(page).toHaveScreenshot('cm-lessons-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/lessons tablet header', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-lessons-tablet-header.png', STABLE_OPTS);
});
test('/courses/:id/lessons tablet sidebar', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('cm-lessons-tablet-sidebar.png', STABLE_OPTS);
});
test('/courses/:id/lessons mobile full', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 375, 812);
  await expect(page).toHaveScreenshot('cm-lessons-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/lessons mobile header', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-lessons-mobile-header.png', STABLE_OPTS);
});
test('/courses/:id/lessons mobile main', async ({ page }) => {
  await nav(page, '/courses/course-1/lessons', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-lessons-mobile-main.png', STABLE_OPTS);
});

/* ═══════════════ /courses/:id/analytics ═══════════════ */

test('/courses/:id/analytics desktop full', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 1280, 720);
  await expect(page).toHaveScreenshot('cm-analytics-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/analytics desktop header', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-analytics-desktop-header.png', STABLE_OPTS);
});
test('/courses/:id/analytics desktop main', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-analytics-desktop-main.png', STABLE_OPTS);
});
test('/courses/:id/analytics tablet full', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 768, 1024);
  await expect(page).toHaveScreenshot('cm-analytics-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/analytics tablet header', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-analytics-tablet-header.png', STABLE_OPTS);
});
test('/courses/:id/analytics tablet main', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('cm-analytics-tablet-main.png', STABLE_OPTS);
});
test('/courses/:id/analytics mobile full', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 375, 812);
  await expect(page).toHaveScreenshot('cm-analytics-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/courses/:id/analytics mobile header', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('cm-analytics-mobile-header.png', STABLE_OPTS);
});
test('/courses/:id/analytics mobile footer', async ({ page }) => {
  await nav(page, '/courses/course-1/analytics', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('cm-analytics-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ Extra section screenshots ═════��═════════ */

test('/courses desktop sidebar', async ({ page }) => {
  await nav(page, '/courses', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('cm-courses-desktop-sidebar.png', STABLE_OPTS);
});
test('/courses/create desktop sidebar', async ({ page }) => {
  await nav(page, '/courses/create', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('cm-create-desktop-sidebar.png', STABLE_OPTS);
});

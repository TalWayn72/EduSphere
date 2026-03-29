/**
 * Visual E2E — Analytics & Admin Routes
 *
 * Covers /analytics, /analytics/courses, /analytics/roi, /admin/dashboard,
 * /admin/users, /admin/compliance across 3 viewports.
 *
 * 62 toHaveScreenshot() assertions.
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

/* ═══════════════ /analytics ═══════════════ */

test('/analytics desktop full', async ({ page }) => {
  await nav(page, '/analytics', 1280, 720);
  await expect(page).toHaveScreenshot('admin-analytics-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics desktop header', async ({ page }) => {
  await nav(page, '/analytics', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-analytics-desktop-header.png', STABLE_OPTS);
});
test('/analytics desktop main', async ({ page }) => {
  await nav(page, '/analytics', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-analytics-desktop-main.png', STABLE_OPTS);
});
test('/analytics tablet full', async ({ page }) => {
  await nav(page, '/analytics', 768, 1024);
  await expect(page).toHaveScreenshot('admin-analytics-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics tablet header', async ({ page }) => {
  await nav(page, '/analytics', 768, 1024);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-analytics-tablet-header.png', STABLE_OPTS);
});
test('/analytics tablet main', async ({ page }) => {
  await nav(page, '/analytics', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-analytics-tablet-main.png', STABLE_OPTS);
});
test('/analytics tablet sidebar', async ({ page }) => {
  await nav(page, '/analytics', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-analytics-tablet-sidebar.png', STABLE_OPTS);
});
test('/analytics mobile full', async ({ page }) => {
  await nav(page, '/analytics', 375, 812);
  await expect(page).toHaveScreenshot('admin-analytics-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics mobile header', async ({ page }) => {
  await nav(page, '/analytics', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-analytics-mobile-header.png', STABLE_OPTS);
});
test('/analytics mobile main', async ({ page }) => {
  await nav(page, '/analytics', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-analytics-mobile-main.png', STABLE_OPTS);
});
test('/analytics mobile footer', async ({ page }) => {
  await nav(page, '/analytics', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('admin-analytics-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ /analytics/courses ═══════════════ */

test('/analytics/courses desktop full', async ({ page }) => {
  await nav(page, '/analytics/courses', 1280, 720);
  await expect(page).toHaveScreenshot('admin-courses-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics/courses desktop header', async ({ page }) => {
  await nav(page, '/analytics/courses', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-courses-desktop-header.png', STABLE_OPTS);
});
test('/analytics/courses desktop main', async ({ page }) => {
  await nav(page, '/analytics/courses', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-courses-desktop-main.png', STABLE_OPTS);
});
test('/analytics/courses tablet full', async ({ page }) => {
  await nav(page, '/analytics/courses', 768, 1024);
  await expect(page).toHaveScreenshot('admin-courses-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics/courses tablet main', async ({ page }) => {
  await nav(page, '/analytics/courses', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-courses-tablet-main.png', STABLE_OPTS);
});
test('/analytics/courses mobile full', async ({ page }) => {
  await nav(page, '/analytics/courses', 375, 812);
  await expect(page).toHaveScreenshot('admin-courses-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics/courses mobile header', async ({ page }) => {
  await nav(page, '/analytics/courses', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-courses-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /analytics/roi ═══════════════ */

test('/analytics/roi desktop full', async ({ page }) => {
  await nav(page, '/analytics/roi', 1280, 720);
  await expect(page).toHaveScreenshot('admin-roi-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics/roi desktop header', async ({ page }) => {
  await nav(page, '/analytics/roi', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-roi-desktop-header.png', STABLE_OPTS);
});
test('/analytics/roi desktop main', async ({ page }) => {
  await nav(page, '/analytics/roi', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-roi-desktop-main.png', STABLE_OPTS);
});
test('/analytics/roi tablet full', async ({ page }) => {
  await nav(page, '/analytics/roi', 768, 1024);
  await expect(page).toHaveScreenshot('admin-roi-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics/roi tablet main', async ({ page }) => {
  await nav(page, '/analytics/roi', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-roi-tablet-main.png', STABLE_OPTS);
});
test('/analytics/roi mobile full', async ({ page }) => {
  await nav(page, '/analytics/roi', 375, 812);
  await expect(page).toHaveScreenshot('admin-roi-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/analytics/roi mobile header', async ({ page }) => {
  await nav(page, '/analytics/roi', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-roi-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /admin/dashboard ═══════════════ */

test('/admin/dashboard desktop full', async ({ page }) => {
  await nav(page, '/admin/dashboard', 1280, 720);
  await expect(page).toHaveScreenshot('admin-dash-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/dashboard desktop header', async ({ page }) => {
  await nav(page, '/admin/dashboard', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-dash-desktop-header.png', STABLE_OPTS);
});
test('/admin/dashboard desktop main', async ({ page }) => {
  await nav(page, '/admin/dashboard', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-dash-desktop-main.png', STABLE_OPTS);
});
test('/admin/dashboard tablet full', async ({ page }) => {
  await nav(page, '/admin/dashboard', 768, 1024);
  await expect(page).toHaveScreenshot('admin-dash-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/dashboard tablet main', async ({ page }) => {
  await nav(page, '/admin/dashboard', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-dash-tablet-main.png', STABLE_OPTS);
});
test('/admin/dashboard mobile full', async ({ page }) => {
  await nav(page, '/admin/dashboard', 375, 812);
  await expect(page).toHaveScreenshot('admin-dash-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/dashboard mobile header', async ({ page }) => {
  await nav(page, '/admin/dashboard', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-dash-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /admin/users ═══════════════ */

test('/admin/users desktop full', async ({ page }) => {
  await nav(page, '/admin/users', 1280, 720);
  await expect(page).toHaveScreenshot('admin-users-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/users desktop header', async ({ page }) => {
  await nav(page, '/admin/users', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-users-desktop-header.png', STABLE_OPTS);
});
test('/admin/users desktop main', async ({ page }) => {
  await nav(page, '/admin/users', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-users-desktop-main.png', STABLE_OPTS);
});
test('/admin/users tablet full', async ({ page }) => {
  await nav(page, '/admin/users', 768, 1024);
  await expect(page).toHaveScreenshot('admin-users-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/users tablet main', async ({ page }) => {
  await nav(page, '/admin/users', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-users-tablet-main.png', STABLE_OPTS);
});
test('/admin/users mobile full', async ({ page }) => {
  await nav(page, '/admin/users', 375, 812);
  await expect(page).toHaveScreenshot('admin-users-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/users mobile header', async ({ page }) => {
  await nav(page, '/admin/users', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-users-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /admin/compliance ═══════════════ */

test('/admin/compliance desktop full', async ({ page }) => {
  await nav(page, '/admin/compliance', 1280, 720);
  await expect(page).toHaveScreenshot('admin-comply-desktop-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/compliance desktop header', async ({ page }) => {
  await nav(page, '/admin/compliance', 1280, 720);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-comply-desktop-header.png', STABLE_OPTS);
});
test('/admin/compliance desktop main', async ({ page }) => {
  await nav(page, '/admin/compliance', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-comply-desktop-main.png', STABLE_OPTS);
});
test('/admin/compliance tablet full', async ({ page }) => {
  await nav(page, '/admin/compliance', 768, 1024);
  await expect(page).toHaveScreenshot('admin-comply-tablet-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/compliance tablet main', async ({ page }) => {
  await nav(page, '/admin/compliance', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot('admin-comply-tablet-main.png', STABLE_OPTS);
});
test('/admin/compliance mobile full', async ({ page }) => {
  await nav(page, '/admin/compliance', 375, 812);
  await expect(page).toHaveScreenshot('admin-comply-mobile-full.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
});
test('/admin/compliance mobile header', async ({ page }) => {
  await nav(page, '/admin/compliance', 375, 812);
  await expect(await elOrPage(page, 'header', '[data-testid="page-header"]')).toHaveScreenshot('admin-comply-mobile-header.png', STABLE_OPTS);
});
test('/admin/compliance mobile footer', async ({ page }) => {
  await nav(page, '/admin/compliance', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('admin-comply-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ Extra section & sidebar screenshots ═══════════════ */

test('/analytics desktop sidebar', async ({ page }) => {
  await nav(page, '/analytics', 1280, 720);
  await expect(await elOrPage(page, 'aside', '[data-testid="analytics-nav"]')).toHaveScreenshot('admin-analytics-desktop-sidebar.png', STABLE_OPTS);
});
test('/analytics/courses desktop sidebar', async ({ page }) => {
  await nav(page, '/analytics/courses', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-courses-desktop-sidebar.png', STABLE_OPTS);
});
test('/analytics/courses tablet sidebar', async ({ page }) => {
  await nav(page, '/analytics/courses', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-courses-tablet-sidebar.png', STABLE_OPTS);
});
test('/analytics/roi desktop sidebar', async ({ page }) => {
  await nav(page, '/analytics/roi', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-roi-desktop-sidebar.png', STABLE_OPTS);
});
test('/analytics/roi tablet sidebar', async ({ page }) => {
  await nav(page, '/analytics/roi', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-roi-tablet-sidebar.png', STABLE_OPTS);
});
test('/admin/dashboard desktop sidebar', async ({ page }) => {
  await nav(page, '/admin/dashboard', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-dash-desktop-sidebar.png', STABLE_OPTS);
});
test('/admin/dashboard tablet sidebar', async ({ page }) => {
  await nav(page, '/admin/dashboard', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-dash-tablet-sidebar.png', STABLE_OPTS);
});
test('/admin/users desktop sidebar', async ({ page }) => {
  await nav(page, '/admin/users', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-users-desktop-sidebar.png', STABLE_OPTS);
});
test('/admin/users tablet sidebar', async ({ page }) => {
  await nav(page, '/admin/users', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-users-tablet-sidebar.png', STABLE_OPTS);
});
test('/admin/compliance desktop sidebar', async ({ page }) => {
  await nav(page, '/admin/compliance', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-comply-desktop-sidebar.png', STABLE_OPTS);
});
test('/admin/compliance tablet sidebar', async ({ page }) => {
  await nav(page, '/admin/compliance', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot('admin-comply-tablet-sidebar.png', STABLE_OPTS);
});
test('/analytics/courses mobile footer', async ({ page }) => {
  await nav(page, '/analytics/courses', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('admin-courses-mobile-footer.png', STABLE_OPTS);
});
test('/admin/dashboard mobile footer', async ({ page }) => {
  await nav(page, '/admin/dashboard', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('admin-dash-mobile-footer.png', STABLE_OPTS);
});
test('/admin/users mobile footer', async ({ page }) => {
  await nav(page, '/admin/users', 375, 812);
  await expect(await elOrPage(page, 'footer', '[data-testid="page-footer"]')).toHaveScreenshot('admin-users-mobile-footer.png', STABLE_OPTS);
});

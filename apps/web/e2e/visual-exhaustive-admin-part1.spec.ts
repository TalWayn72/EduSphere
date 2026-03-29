import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';

test.use({ reducedMotion: 'reduce' });
const BASE = BASE_URL;
const EO = { animations: 'disabled' as const };

async function prep(page: Page, path: string, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

// ── Full-page screenshots: 10 routes × 3 viewports = 30 calls ──────────────

test('admin desktop full', async ({ page }) => {
  await prep(page, '/admin', 1280, 720);
  await expect(page).toHaveScreenshot('admin-desktop-full.png', EO);
});
test('admin tablet full', async ({ page }) => {
  await prep(page, '/admin', 768, 1024);
  await expect(page).toHaveScreenshot('admin-tablet-full.png', EO);
});
test('admin mobile full', async ({ page }) => {
  await prep(page, '/admin', 375, 812);
  await expect(page).toHaveScreenshot('admin-mobile-full.png', EO);
});
test('compliance desktop full', async ({ page }) => {
  await prep(page, '/admin/compliance', 1280, 720);
  await expect(page).toHaveScreenshot('compliance-desktop-full.png', EO);
});
test('compliance tablet full', async ({ page }) => {
  await prep(page, '/admin/compliance', 768, 1024);
  await expect(page).toHaveScreenshot('compliance-tablet-full.png', EO);
});
test('compliance mobile full', async ({ page }) => {
  await prep(page, '/admin/compliance', 375, 812);
  await expect(page).toHaveScreenshot('compliance-mobile-full.png', EO);
});
test('lti desktop full', async ({ page }) => {
  await prep(page, '/admin/lti', 1280, 720);
  await expect(page).toHaveScreenshot('lti-desktop-full.png', EO);
});
test('lti tablet full', async ({ page }) => {
  await prep(page, '/admin/lti', 768, 1024);
  await expect(page).toHaveScreenshot('lti-tablet-full.png', EO);
});
test('lti mobile full', async ({ page }) => {
  await prep(page, '/admin/lti', 375, 812);
  await expect(page).toHaveScreenshot('lti-mobile-full.png', EO);
});
test('scim desktop full', async ({ page }) => {
  await prep(page, '/admin/scim', 1280, 720);
  await expect(page).toHaveScreenshot('scim-desktop-full.png', EO);
});
test('scim tablet full', async ({ page }) => {
  await prep(page, '/admin/scim', 768, 1024);
  await expect(page).toHaveScreenshot('scim-tablet-full.png', EO);
});
test('scim mobile full', async ({ page }) => {
  await prep(page, '/admin/scim', 375, 812);
  await expect(page).toHaveScreenshot('scim-mobile-full.png', EO);
});
test('settings desktop full', async ({ page }) => {
  await prep(page, '/admin/settings', 1280, 720);
  await expect(page).toHaveScreenshot('settings-desktop-full.png', EO);
});
test('settings tablet full', async ({ page }) => {
  await prep(page, '/admin/settings', 768, 1024);
  await expect(page).toHaveScreenshot('settings-tablet-full.png', EO);
});
test('settings mobile full', async ({ page }) => {
  await prep(page, '/admin/settings', 375, 812);
  await expect(page).toHaveScreenshot('settings-mobile-full.png', EO);
});
test('users desktop full', async ({ page }) => {
  await prep(page, '/admin/users', 1280, 720);
  await expect(page).toHaveScreenshot('users-desktop-full.png', EO);
});
test('users tablet full', async ({ page }) => {
  await prep(page, '/admin/users', 768, 1024);
  await expect(page).toHaveScreenshot('users-tablet-full.png', EO);
});
test('users mobile full', async ({ page }) => {
  await prep(page, '/admin/users', 375, 812);
  await expect(page).toHaveScreenshot('users-mobile-full.png', EO);
});
test('roles desktop full', async ({ page }) => {
  await prep(page, '/admin/roles', 1280, 720);
  await expect(page).toHaveScreenshot('roles-desktop-full.png', EO);
});
test('roles tablet full', async ({ page }) => {
  await prep(page, '/admin/roles', 768, 1024);
  await expect(page).toHaveScreenshot('roles-tablet-full.png', EO);
});
test('roles mobile full', async ({ page }) => {
  await prep(page, '/admin/roles', 375, 812);
  await expect(page).toHaveScreenshot('roles-mobile-full.png', EO);
});
test('tenants desktop full', async ({ page }) => {
  await prep(page, '/admin/tenants', 1280, 720);
  await expect(page).toHaveScreenshot('tenants-desktop-full.png', EO);
});
test('tenants tablet full', async ({ page }) => {
  await prep(page, '/admin/tenants', 768, 1024);
  await expect(page).toHaveScreenshot('tenants-tablet-full.png', EO);
});
test('tenants mobile full', async ({ page }) => {
  await prep(page, '/admin/tenants', 375, 812);
  await expect(page).toHaveScreenshot('tenants-mobile-full.png', EO);
});
test('audit desktop full', async ({ page }) => {
  await prep(page, '/admin/audit', 1280, 720);
  await expect(page).toHaveScreenshot('audit-desktop-full.png', EO);
});
test('audit tablet full', async ({ page }) => {
  await prep(page, '/admin/audit', 768, 1024);
  await expect(page).toHaveScreenshot('audit-tablet-full.png', EO);
});
test('audit mobile full', async ({ page }) => {
  await prep(page, '/admin/audit', 375, 812);
  await expect(page).toHaveScreenshot('audit-mobile-full.png', EO);
});
test('analytics desktop full', async ({ page }) => {
  await prep(page, '/admin/analytics', 1280, 720);
  await expect(page).toHaveScreenshot('analytics-desktop-full.png', EO);
});
test('analytics tablet full', async ({ page }) => {
  await prep(page, '/admin/analytics', 768, 1024);
  await expect(page).toHaveScreenshot('analytics-tablet-full.png', EO);
});
test('analytics mobile full', async ({ page }) => {
  await prep(page, '/admin/analytics', 375, 812);
  await expect(page).toHaveScreenshot('analytics-mobile-full.png', EO);
});

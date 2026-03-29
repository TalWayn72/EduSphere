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

async function snapEl(page: Page, sel: string, name: string) {
  const el = page.locator(sel).first();
  if (await el.isVisible().catch(() => false)) {
    await expect(el).toHaveScreenshot(name, EO);
  } else {
    await expect(page).toHaveScreenshot(`${name.replace('.png', '-fallback.png')}`, EO);
  }
}

// ── Element-level screenshots ────────────────────────────────────────────────

test('admin desktop sidebar', async ({ page }) => {
  await prep(page, '/admin', 1280, 720);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'admin-desktop-sidebar.png');
});
test('admin desktop header', async ({ page }) => {
  await prep(page, '/admin', 1280, 720);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'admin-desktop-header.png');
});
test('admin desktop main-content', async ({ page }) => {
  await prep(page, '/admin', 1280, 720);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'admin-desktop-main.png');
});
test('admin tablet sidebar', async ({ page }) => {
  await prep(page, '/admin', 768, 1024);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'admin-tablet-sidebar.png');
});
test('admin mobile header', async ({ page }) => {
  await prep(page, '/admin', 375, 812);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'admin-mobile-header.png');
});
test('compliance desktop sidebar', async ({ page }) => {
  await prep(page, '/admin/compliance', 1280, 720);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'compliance-desktop-sidebar.png');
});
test('compliance desktop tables', async ({ page }) => {
  await prep(page, '/admin/compliance', 1280, 720);
  await snapEl(page, 'table, [data-testid="data-table"], [role="grid"]', 'compliance-desktop-tables.png');
});
test('compliance tablet header', async ({ page }) => {
  await prep(page, '/admin/compliance', 768, 1024);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'compliance-tablet-header.png');
});
test('lti desktop forms', async ({ page }) => {
  await prep(page, '/admin/lti', 1280, 720);
  await snapEl(page, 'form, [data-testid="form"]', 'lti-desktop-forms.png');
});
test('lti desktop action-buttons', async ({ page }) => {
  await prep(page, '/admin/lti', 1280, 720);
  await snapEl(page, '[data-testid="action-buttons"], .action-bar, footer button', 'lti-desktop-actions.png');
});
test('lti tablet main-content', async ({ page }) => {
  await prep(page, '/admin/lti', 768, 1024);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'lti-tablet-main.png');
});
test('scim desktop header', async ({ page }) => {
  await prep(page, '/admin/scim', 1280, 720);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'scim-desktop-header.png');
});
test('scim desktop tables', async ({ page }) => {
  await prep(page, '/admin/scim', 1280, 720);
  await snapEl(page, 'table, [data-testid="data-table"], [role="grid"]', 'scim-desktop-tables.png');
});
test('scim mobile main-content', async ({ page }) => {
  await prep(page, '/admin/scim', 375, 812);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'scim-mobile-main.png');
});
test('settings desktop sidebar', async ({ page }) => {
  await prep(page, '/admin/settings', 1280, 720);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'settings-desktop-sidebar.png');
});
test('settings desktop forms', async ({ page }) => {
  await prep(page, '/admin/settings', 1280, 720);
  await snapEl(page, 'form, [data-testid="form"]', 'settings-desktop-forms.png');
});
test('settings tablet breadcrumbs', async ({ page }) => {
  await prep(page, '/admin/settings', 768, 1024);
  await snapEl(page, 'nav[aria-label*="bread"], [data-testid="breadcrumbs"]', 'settings-tablet-breadcrumbs.png');
});
test('settings mobile header', async ({ page }) => {
  await prep(page, '/admin/settings', 375, 812);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'settings-mobile-header.png');
});
test('users desktop tables', async ({ page }) => {
  await prep(page, '/admin/users', 1280, 720);
  await snapEl(page, 'table, [data-testid="data-table"], [role="grid"]', 'users-desktop-tables.png');
});
test('users desktop action-buttons', async ({ page }) => {
  await prep(page, '/admin/users', 1280, 720);
  await snapEl(page, '[data-testid="action-buttons"], .action-bar, footer button', 'users-desktop-actions.png');
});
test('users tablet sidebar', async ({ page }) => {
  await prep(page, '/admin/users', 768, 1024);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'users-tablet-sidebar.png');
});
test('roles desktop main-content', async ({ page }) => {
  await prep(page, '/admin/roles', 1280, 720);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'roles-desktop-main.png');
});
test('roles desktop tables', async ({ page }) => {
  await prep(page, '/admin/roles', 1280, 720);
  await snapEl(page, 'table, [data-testid="data-table"], [role="grid"]', 'roles-desktop-tables.png');
});
test('roles tablet header', async ({ page }) => {
  await prep(page, '/admin/roles', 768, 1024);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'roles-tablet-header.png');
});
test('tenants desktop sidebar', async ({ page }) => {
  await prep(page, '/admin/tenants', 1280, 720);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'tenants-desktop-sidebar.png');
});
test('tenants desktop stats-cards', async ({ page }) => {
  await prep(page, '/admin/tenants', 1280, 720);
  await snapEl(page, '[data-testid="stats-cards"], [data-testid="stat-card"], .stats-grid', 'tenants-desktop-stats.png');
});
test('tenants tablet main-content', async ({ page }) => {
  await prep(page, '/admin/tenants', 768, 1024);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'tenants-tablet-main.png');
});
test('tenants mobile header', async ({ page }) => {
  await prep(page, '/admin/tenants', 375, 812);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'tenants-mobile-header.png');
});
test('audit desktop tables', async ({ page }) => {
  await prep(page, '/admin/audit', 1280, 720);
  await snapEl(page, 'table, [data-testid="data-table"], [role="grid"]', 'audit-desktop-tables.png');
});
test('audit desktop breadcrumbs', async ({ page }) => {
  await prep(page, '/admin/audit', 1280, 720);
  await snapEl(page, 'nav[aria-label*="bread"], [data-testid="breadcrumbs"]', 'audit-desktop-breadcrumbs.png');
});
test('audit tablet sidebar', async ({ page }) => {
  await prep(page, '/admin/audit', 768, 1024);
  await snapEl(page, 'aside, [data-testid="sidebar"], [role="complementary"]', 'audit-tablet-sidebar.png');
});
test('audit mobile main-content', async ({ page }) => {
  await prep(page, '/admin/audit', 375, 812);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'audit-mobile-main.png');
});
test('analytics desktop stats-cards', async ({ page }) => {
  await prep(page, '/admin/analytics', 1280, 720);
  await snapEl(page, '[data-testid="stats-cards"], [data-testid="stat-card"], .stats-grid', 'analytics-desktop-stats.png');
});
test('analytics desktop main-content', async ({ page }) => {
  await prep(page, '/admin/analytics', 1280, 720);
  await snapEl(page, 'main, [role="main"], [data-testid="main-content"]', 'analytics-desktop-main.png');
});
test('analytics tablet header', async ({ page }) => {
  await prep(page, '/admin/analytics', 768, 1024);
  await snapEl(page, 'header, [data-testid="header"], [role="banner"]', 'analytics-tablet-header.png');
});

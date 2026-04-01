import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';
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

// ─── Full-page: 10 routes × 3 viewports = 30 calls ─────────────────────────

test.describe('Full Page — Desktop 1280x720', () => {
  test.setTimeout(60_000);
  test('dashboard desktop', async ({ page }) => {
    await prep(page, '/dashboard', 1280, 720);
    await expect(page).toHaveScreenshot('exh-dash-d-full.png', STABLE_OPTS);
  });
  test('courses desktop', async ({ page }) => {
    await prep(page, '/courses', 1280, 720);
    await expect(page).toHaveScreenshot('exh-courses-d-full.png', STABLE_OPTS);
  });
  test('search desktop', async ({ page }) => {
    await prep(page, '/search', 1280, 720);
    await expect(page).toHaveScreenshot('exh-search-d-full.png', STABLE_OPTS);
  });
  test('knowledge-graph desktop', async ({ page }) => {
    await prep(page, '/knowledge-graph', 1280, 720);
    await expect(page).toHaveScreenshot('exh-kg-d-full.png', STABLE_OPTS);
  });
  test('profile desktop', async ({ page }) => {
    await prep(page, '/profile', 1280, 720);
    await expect(page).toHaveScreenshot('exh-profile-d-full.png', STABLE_OPTS);
  });
  test('settings desktop', async ({ page }) => {
    await prep(page, '/settings', 1280, 720);
    await expect(page).toHaveScreenshot('exh-settings-d-full.png', STABLE_OPTS);
  });
  test('notifications desktop', async ({ page }) => {
    await prep(page, '/notifications', 1280, 720);
    await expect(page).toHaveScreenshot('exh-notif-d-full.png', STABLE_OPTS);
  });
  test('calendar desktop', async ({ page }) => {
    await prep(page, '/calendar', 1280, 720);
    await expect(page).toHaveScreenshot('exh-calendar-d-full.png', STABLE_OPTS);
  });
  test('grades desktop', async ({ page }) => {
    await prep(page, '/grades', 1280, 720);
    await expect(page).toHaveScreenshot('exh-grades-d-full.png', STABLE_OPTS);
  });
  test('certificates desktop', async ({ page }) => {
    await prep(page, '/certificates', 1280, 720);
    await expect(page).toHaveScreenshot('exh-certs-d-full.png', STABLE_OPTS);
  });
});

test.describe('Full Page — Tablet 768x1024', () => {
  test.setTimeout(60_000);
  test('dashboard tablet', async ({ page }) => {
    await prep(page, '/dashboard', 768, 1024);
    await expect(page).toHaveScreenshot('exh-dash-t-full.png', STABLE_OPTS);
  });
  test('courses tablet', async ({ page }) => {
    await prep(page, '/courses', 768, 1024);
    await expect(page).toHaveScreenshot('exh-courses-t-full.png', STABLE_OPTS);
  });
  test('search tablet', async ({ page }) => {
    await prep(page, '/search', 768, 1024);
    await expect(page).toHaveScreenshot('exh-search-t-full.png', STABLE_OPTS);
  });
  test('knowledge-graph tablet', async ({ page }) => {
    await prep(page, '/knowledge-graph', 768, 1024);
    await expect(page).toHaveScreenshot('exh-kg-t-full.png', STABLE_OPTS);
  });
  test('profile tablet', async ({ page }) => {
    await prep(page, '/profile', 768, 1024);
    await expect(page).toHaveScreenshot('exh-profile-t-full.png', STABLE_OPTS);
  });
  test('settings tablet', async ({ page }) => {
    await prep(page, '/settings', 768, 1024);
    await expect(page).toHaveScreenshot('exh-settings-t-full.png', STABLE_OPTS);
  });
  test('notifications tablet', async ({ page }) => {
    await prep(page, '/notifications', 768, 1024);
    await expect(page).toHaveScreenshot('exh-notif-t-full.png', STABLE_OPTS);
  });
  test('calendar tablet', async ({ page }) => {
    await prep(page, '/calendar', 768, 1024);
    await expect(page).toHaveScreenshot('exh-calendar-t-full.png', STABLE_OPTS);
  });
  test('grades tablet', async ({ page }) => {
    await prep(page, '/grades', 768, 1024);
    await expect(page).toHaveScreenshot('exh-grades-t-full.png', STABLE_OPTS);
  });
  test('certificates tablet', async ({ page }) => {
    await prep(page, '/certificates', 768, 1024);
    await expect(page).toHaveScreenshot('exh-certs-t-full.png', STABLE_OPTS);
  });
});

test.describe('Full Page — Mobile 375x812', () => {
  test.setTimeout(60_000);
  test('dashboard mobile', async ({ page }) => {
    await prep(page, '/dashboard', 375, 812);
    await expect(page).toHaveScreenshot('exh-dash-m-full.png', STABLE_OPTS);
  });
  test('courses mobile', async ({ page }) => {
    await prep(page, '/courses', 375, 812);
    await expect(page).toHaveScreenshot('exh-courses-m-full.png', STABLE_OPTS);
  });
  test('search mobile', async ({ page }) => {
    await prep(page, '/search', 375, 812);
    await expect(page).toHaveScreenshot('exh-search-m-full.png', STABLE_OPTS);
  });
  test('knowledge-graph mobile', async ({ page }) => {
    await prep(page, '/knowledge-graph', 375, 812);
    await expect(page).toHaveScreenshot('exh-kg-m-full.png', STABLE_OPTS);
  });
  test('profile mobile', async ({ page }) => {
    await prep(page, '/profile', 375, 812);
    await expect(page).toHaveScreenshot('exh-profile-m-full.png', STABLE_OPTS);
  });
  test('settings mobile', async ({ page }) => {
    await prep(page, '/settings', 375, 812);
    await expect(page).toHaveScreenshot('exh-settings-m-full.png', STABLE_OPTS);
  });
  test('notifications mobile', async ({ page }) => {
    await prep(page, '/notifications', 375, 812);
    await expect(page).toHaveScreenshot('exh-notif-m-full.png', STABLE_OPTS);
  });
  test('calendar mobile', async ({ page }) => {
    await prep(page, '/calendar', 375, 812);
    await expect(page).toHaveScreenshot('exh-calendar-m-full.png', STABLE_OPTS);
  });
  test('grades mobile', async ({ page }) => {
    await prep(page, '/grades', 375, 812);
    await expect(page).toHaveScreenshot('exh-grades-m-full.png', STABLE_OPTS);
  });
  test('certificates mobile', async ({ page }) => {
    await prep(page, '/certificates', 375, 812);
    await expect(page).toHaveScreenshot('exh-certs-m-full.png', STABLE_OPTS);
  });
});

// ─── Sidebar: 10 routes × desktop = 20 calls (if/else) ─────────────────────

test.describe('Sidebar — Desktop', () => {
  test.setTimeout(60_000);
  const S =
    'aside, [data-testid="sidebar"], nav[aria-label*="side"], [role="complementary"]';
  test('dashboard sidebar', async ({ page }) => {
    await prep(page, '/dashboard', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-dash-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-dash-d-sidebar.png', EO);
  });
  test('courses sidebar', async ({ page }) => {
    await prep(page, '/courses', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-courses-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-courses-d-sidebar.png', EO);
  });
  test('search sidebar', async ({ page }) => {
    await prep(page, '/search', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-search-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-search-d-sidebar.png', EO);
  });
  test('kg sidebar', async ({ page }) => {
    await prep(page, '/knowledge-graph', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-kg-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-kg-d-sidebar.png', EO);
  });
  test('profile sidebar', async ({ page }) => {
    await prep(page, '/profile', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-profile-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-profile-d-sidebar.png', EO);
  });
  test('settings sidebar', async ({ page }) => {
    await prep(page, '/settings', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-settings-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-settings-d-sidebar.png', EO);
  });
  test('notifications sidebar', async ({ page }) => {
    await prep(page, '/notifications', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-notif-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-notif-d-sidebar.png', EO);
  });
  test('calendar sidebar', async ({ page }) => {
    await prep(page, '/calendar', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-calendar-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-calendar-d-sidebar.png', EO);
  });
  test('grades sidebar', async ({ page }) => {
    await prep(page, '/grades', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-grades-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-grades-d-sidebar.png', EO);
  });
  test('certificates sidebar', async ({ page }) => {
    await prep(page, '/certificates', 1280, 720);
    const el = page.locator(S).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-certs-d-sidebar.png', EO);
    else await expect(page).toHaveScreenshot('exh-certs-d-sidebar.png', EO);
  });
});

// ─── Header: 10 routes × desktop = 20 calls (if/else) ──────────────────────

test.describe('Header — Desktop', () => {
  test.setTimeout(60_000);
  const H = 'header, [data-testid="header"], [role="banner"]';
  test('dashboard header', async ({ page }) => {
    await prep(page, '/dashboard', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-dash-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-dash-d-header.png', EO);
  });
  test('courses header', async ({ page }) => {
    await prep(page, '/courses', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-courses-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-courses-d-header.png', EO);
  });
  test('search header', async ({ page }) => {
    await prep(page, '/search', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-search-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-search-d-header.png', EO);
  });
  test('kg header', async ({ page }) => {
    await prep(page, '/knowledge-graph', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-kg-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-kg-d-header.png', EO);
  });
  test('profile header', async ({ page }) => {
    await prep(page, '/profile', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-profile-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-profile-d-header.png', EO);
  });
  test('settings header', async ({ page }) => {
    await prep(page, '/settings', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-settings-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-settings-d-header.png', EO);
  });
  test('notifications header', async ({ page }) => {
    await prep(page, '/notifications', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-notif-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-notif-d-header.png', EO);
  });
  test('calendar header', async ({ page }) => {
    await prep(page, '/calendar', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-calendar-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-calendar-d-header.png', EO);
  });
  test('grades header', async ({ page }) => {
    await prep(page, '/grades', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-grades-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-grades-d-header.png', EO);
  });
  test('certificates header', async ({ page }) => {
    await prep(page, '/certificates', 1280, 720);
    const el = page.locator(H).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-certs-d-header.png', EO);
    else await expect(page).toHaveScreenshot('exh-certs-d-header.png', EO);
  });
});

// ─── Main content: 5 routes × tablet = 10 calls (if/else) ──────────────────

test.describe('Main Content — Tablet', () => {
  test.setTimeout(60_000);
  const M = 'main, [role="main"], [data-testid="main-content"]';
  test('dashboard main', async ({ page }) => {
    await prep(page, '/dashboard', 768, 1024);
    const el = page.locator(M).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-dash-t-main.png', EO);
    else await expect(page).toHaveScreenshot('exh-dash-t-main.png', EO);
  });
  test('courses main', async ({ page }) => {
    await prep(page, '/courses', 768, 1024);
    const el = page.locator(M).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-courses-t-main.png', EO);
    else await expect(page).toHaveScreenshot('exh-courses-t-main.png', EO);
  });
  test('search main', async ({ page }) => {
    await prep(page, '/search', 768, 1024);
    const el = page.locator(M).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-search-t-main.png', EO);
    else await expect(page).toHaveScreenshot('exh-search-t-main.png', EO);
  });
  test('kg main', async ({ page }) => {
    await prep(page, '/knowledge-graph', 768, 1024);
    const el = page.locator(M).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-kg-t-main.png', EO);
    else await expect(page).toHaveScreenshot('exh-kg-t-main.png', EO);
  });
  test('profile main', async ({ page }) => {
    await prep(page, '/profile', 768, 1024);
    const el = page.locator(M).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-profile-t-main.png', EO);
    else await expect(page).toHaveScreenshot('exh-profile-t-main.png', EO);
  });
});

// ─── Cards: 5 routes × mobile = 10 calls (if/else) ─────────────────────────

test.describe('Cards — Mobile', () => {
  test.setTimeout(60_000);
  const C =
    '[data-testid="card"], [data-testid="course-card"], .card, [role="article"]';
  test('dashboard cards', async ({ page }) => {
    await prep(page, '/dashboard', 375, 812);
    const el = page.locator(C).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-dash-m-cards.png', EO);
    else await expect(page).toHaveScreenshot('exh-dash-m-cards.png', EO);
  });
  test('courses cards', async ({ page }) => {
    await prep(page, '/courses', 375, 812);
    const el = page.locator(C).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-courses-m-cards.png', EO);
    else await expect(page).toHaveScreenshot('exh-courses-m-cards.png', EO);
  });
  test('search cards', async ({ page }) => {
    await prep(page, '/search', 375, 812);
    const el = page.locator(C).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-search-m-cards.png', EO);
    else await expect(page).toHaveScreenshot('exh-search-m-cards.png', EO);
  });
  test('grades cards', async ({ page }) => {
    await prep(page, '/grades', 375, 812);
    const el = page.locator(C).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-grades-m-cards.png', EO);
    else await expect(page).toHaveScreenshot('exh-grades-m-cards.png', EO);
  });
  test('certificates cards', async ({ page }) => {
    await prep(page, '/certificates', 375, 812);
    const el = page.locator(C).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-certs-m-cards.png', EO);
    else await expect(page).toHaveScreenshot('exh-certs-m-cards.png', EO);
  });
});

// ─── Action buttons: 5 routes × desktop = 10 calls (if/else) ───────────────

test.describe('Action Buttons — Desktop', () => {
  test.setTimeout(60_000);
  const A =
    '[data-testid="action-buttons"], [data-testid="actions"], .actions, [role="toolbar"]';
  test('dashboard actions', async ({ page }) => {
    await prep(page, '/dashboard', 1280, 720);
    const el = page.locator(A).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-dash-d-actions.png', EO);
    else await expect(page).toHaveScreenshot('exh-dash-d-actions.png', EO);
  });
  test('courses actions', async ({ page }) => {
    await prep(page, '/courses', 1280, 720);
    const el = page.locator(A).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-courses-d-actions.png', EO);
    else await expect(page).toHaveScreenshot('exh-courses-d-actions.png', EO);
  });
  test('settings actions', async ({ page }) => {
    await prep(page, '/settings', 1280, 720);
    const el = page.locator(A).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-settings-d-actions.png', EO);
    else await expect(page).toHaveScreenshot('exh-settings-d-actions.png', EO);
  });
  test('notifications actions', async ({ page }) => {
    await prep(page, '/notifications', 1280, 720);
    const el = page.locator(A).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-notif-d-actions.png', EO);
    else await expect(page).toHaveScreenshot('exh-notif-d-actions.png', EO);
  });
  test('calendar actions', async ({ page }) => {
    await prep(page, '/calendar', 1280, 720);
    const el = page.locator(A).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false))
      await expect(el).toHaveScreenshot('exh-calendar-d-actions.png', EO);
    else await expect(page).toHaveScreenshot('exh-calendar-d-actions.png', EO);
  });
});

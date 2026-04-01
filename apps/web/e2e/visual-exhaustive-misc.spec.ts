/**
 * Visual Exhaustive Misc — 50 screenshot assertions across miscellaneous routes and viewports.
 * Covers public auth pages, dashboard widgets, catalog, library, messages, and onboarding.
 */
import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';
import { BASE_URL } from './env';

test.use({ reducedMotion: 'reduce' });
const BASE = BASE_URL;

async function prep(page: Page, path: string, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

// ─── Public Auth Pages ──────────────────────────────────────────────────────

test('register desktop', async ({ page }) => {
  await prep(page, '/register', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-register-d.png', STABLE_OPTS);
});
test('register mobile', async ({ page }) => {
  await prep(page, '/register', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-register-m.png', STABLE_OPTS);
});
test('register tablet', async ({ page }) => {
  await prep(page, '/register', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-register-t.png', STABLE_OPTS);
});

test('forgot-password desktop', async ({ page }) => {
  await prep(page, '/forgot-password', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-forgot-pw-d.png', STABLE_OPTS);
});
test('forgot-password mobile', async ({ page }) => {
  await prep(page, '/forgot-password', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-forgot-pw-m.png', STABLE_OPTS);
});
test('forgot-password tablet', async ({ page }) => {
  await prep(page, '/forgot-password', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-forgot-pw-t.png', STABLE_OPTS);
});

test('reset-password desktop', async ({ page }) => {
  await prep(page, '/reset-password', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-reset-pw-d.png', STABLE_OPTS);
});
test('reset-password mobile', async ({ page }) => {
  await prep(page, '/reset-password', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-reset-pw-m.png', STABLE_OPTS);
});
test('reset-password tablet', async ({ page }) => {
  await prep(page, '/reset-password', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-reset-pw-t.png', STABLE_OPTS);
});

test('verify-email desktop', async ({ page }) => {
  await prep(page, '/verify-email', 1280, 720);
  await expect(page).toHaveScreenshot(
    'exh-misc-verify-email-d.png',
    STABLE_OPTS
  );
});
test('verify-email mobile', async ({ page }) => {
  await prep(page, '/verify-email', 375, 812);
  await expect(page).toHaveScreenshot(
    'exh-misc-verify-email-m.png',
    STABLE_OPTS
  );
});
test('verify-email tablet', async ({ page }) => {
  await prep(page, '/verify-email', 768, 1024);
  await expect(page).toHaveScreenshot(
    'exh-misc-verify-email-t.png',
    STABLE_OPTS
  );
});

test('onboarding desktop', async ({ page }) => {
  await prep(page, '/onboarding', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-onboarding-d.png', STABLE_OPTS);
});
test('onboarding mobile', async ({ page }) => {
  await prep(page, '/onboarding', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-onboarding-m.png', STABLE_OPTS);
});
test('onboarding tablet', async ({ page }) => {
  await prep(page, '/onboarding', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-onboarding-t.png', STABLE_OPTS);
});

// ─── Dashboard Widgets ──────────────────────────────────────────────────────

test('dashboard-widgets desktop', async ({ page }) => {
  await prep(page, '/dashboard/widgets', 1280, 720);
  await expect(page).toHaveScreenshot(
    'exh-misc-dash-widgets-d.png',
    STABLE_OPTS
  );
});
test('dashboard-widgets mobile', async ({ page }) => {
  await prep(page, '/dashboard/widgets', 375, 812);
  await expect(page).toHaveScreenshot(
    'exh-misc-dash-widgets-m.png',
    STABLE_OPTS
  );
});
test('dashboard-widgets tablet', async ({ page }) => {
  await prep(page, '/dashboard/widgets', 768, 1024);
  await expect(page).toHaveScreenshot(
    'exh-misc-dash-widgets-t.png',
    STABLE_OPTS
  );
});

// ─── Courses ────────────────────────────────────────────────────────────────

test('courses-catalog desktop', async ({ page }) => {
  await prep(page, '/courses/catalog', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-catalog-d.png', STABLE_OPTS);
});
test('courses-catalog mobile', async ({ page }) => {
  await prep(page, '/courses/catalog', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-catalog-m.png', STABLE_OPTS);
});
test('courses-catalog tablet', async ({ page }) => {
  await prep(page, '/courses/catalog', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-catalog-t.png', STABLE_OPTS);
});

test('courses-favorites desktop', async ({ page }) => {
  await prep(page, '/courses/favorites', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-favorites-d.png', STABLE_OPTS);
});
test('courses-favorites mobile', async ({ page }) => {
  await prep(page, '/courses/favorites', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-favorites-m.png', STABLE_OPTS);
});
test('courses-favorites tablet', async ({ page }) => {
  await prep(page, '/courses/favorites', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-favorites-t.png', STABLE_OPTS);
});

// ─── Library ────────────────────────────────────────────────────────────────

test('library desktop', async ({ page }) => {
  await prep(page, '/library', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-library-d.png', STABLE_OPTS);
});
test('library mobile', async ({ page }) => {
  await prep(page, '/library', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-library-m.png', STABLE_OPTS);
});
test('library tablet', async ({ page }) => {
  await prep(page, '/library', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-library-t.png', STABLE_OPTS);
});

// ─── Messages ───────────────────────────────────────────────────────────────

test('messages desktop', async ({ page }) => {
  await prep(page, '/messages', 1280, 720);
  await expect(page).toHaveScreenshot('exh-misc-messages-d.png', STABLE_OPTS);
});
test('messages mobile', async ({ page }) => {
  await prep(page, '/messages', 375, 812);
  await expect(page).toHaveScreenshot('exh-misc-messages-m.png', STABLE_OPTS);
});
test('messages tablet', async ({ page }) => {
  await prep(page, '/messages', 768, 1024);
  await expect(page).toHaveScreenshot('exh-misc-messages-t.png', STABLE_OPTS);
});

// ─── Additional Public Pages ────────────────────────────────────────────────

test('register wide', async ({ page }) => {
  await prep(page, '/register', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-register-w.png', STABLE_OPTS);
});
test('forgot-password wide', async ({ page }) => {
  await prep(page, '/forgot-password', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-forgot-pw-w.png', STABLE_OPTS);
});
test('reset-password wide', async ({ page }) => {
  await prep(page, '/reset-password', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-reset-pw-w.png', STABLE_OPTS);
});
test('verify-email wide', async ({ page }) => {
  await prep(page, '/verify-email', 1920, 1080);
  await expect(page).toHaveScreenshot(
    'exh-misc-verify-email-w.png',
    STABLE_OPTS
  );
});
test('onboarding wide', async ({ page }) => {
  await prep(page, '/onboarding', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-onboarding-w.png', STABLE_OPTS);
});

// ─── Additional Authenticated Pages ─────────────────────────────────────────

test('dashboard-widgets wide', async ({ page }) => {
  await prep(page, '/dashboard/widgets', 1920, 1080);
  await expect(page).toHaveScreenshot(
    'exh-misc-dash-widgets-w.png',
    STABLE_OPTS
  );
});
test('courses-catalog wide', async ({ page }) => {
  await prep(page, '/courses/catalog', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-catalog-w.png', STABLE_OPTS);
});
test('courses-favorites wide', async ({ page }) => {
  await prep(page, '/courses/favorites', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-favorites-w.png', STABLE_OPTS);
});
test('library wide', async ({ page }) => {
  await prep(page, '/library', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-library-w.png', STABLE_OPTS);
});
test('messages wide', async ({ page }) => {
  await prep(page, '/messages', 1920, 1080);
  await expect(page).toHaveScreenshot('exh-misc-messages-w.png', STABLE_OPTS);
});

// ─── Narrow Viewport (320px) ────────────────────────────────────────────────

test('register narrow', async ({ page }) => {
  await prep(page, '/register', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-register-n.png', STABLE_OPTS);
});
test('forgot-password narrow', async ({ page }) => {
  await prep(page, '/forgot-password', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-forgot-pw-n.png', STABLE_OPTS);
});
test('reset-password narrow', async ({ page }) => {
  await prep(page, '/reset-password', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-reset-pw-n.png', STABLE_OPTS);
});
test('verify-email narrow', async ({ page }) => {
  await prep(page, '/verify-email', 320, 568);
  await expect(page).toHaveScreenshot(
    'exh-misc-verify-email-n.png',
    STABLE_OPTS
  );
});
test('onboarding narrow', async ({ page }) => {
  await prep(page, '/onboarding', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-onboarding-n.png', STABLE_OPTS);
});
test('dashboard-widgets narrow', async ({ page }) => {
  await prep(page, '/dashboard/widgets', 320, 568);
  await expect(page).toHaveScreenshot(
    'exh-misc-dash-widgets-n.png',
    STABLE_OPTS
  );
});
test('courses-catalog narrow', async ({ page }) => {
  await prep(page, '/courses/catalog', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-catalog-n.png', STABLE_OPTS);
});
test('courses-favorites narrow', async ({ page }) => {
  await prep(page, '/courses/favorites', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-favorites-n.png', STABLE_OPTS);
});
test('library narrow', async ({ page }) => {
  await prep(page, '/library', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-library-n.png', STABLE_OPTS);
});
test('messages narrow', async ({ page }) => {
  await prep(page, '/messages', 320, 568);
  await expect(page).toHaveScreenshot('exh-misc-messages-n.png', STABLE_OPTS);
});

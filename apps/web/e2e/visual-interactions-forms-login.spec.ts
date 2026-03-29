/**
 * Visual Interactions — Form States (Login)
 *
 * Captures UI states for login form interactions: focus, validation errors,
 * filled values, hover states.
 * Split from visual-interactions-forms.spec.ts (Part 1 of 2).
 */
import { test, expect } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

// ─── Helper: resilient element screenshot with visibility fallback ──────────
async function screenshotElement(
  page: import('@playwright/test').Page,
  selector: string,
  name: string,
  opts = STABLE_OPTS,
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

// ─── Login page form states (no auth needed) ────────────────────────────────

test.describe('Visual Interactions — Forms (Login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
  });

  test('login form default state', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await screenshotElement(page, 'form, [data-testid="login-form"], main', 'interact-forms-login-default.png');
  });

  test('login email input focused', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const email = page.locator('input[type="email"], input[name="email"], #username').first();
    if (await email.isVisible({ timeout: 3000 }).catch(() => false)) {
      await email.focus();
      await page.waitForTimeout(200);
    }
    await screenshotElement(page, 'form, [data-testid="login-form"], main', 'interact-forms-login-email-focused.png');
  });

  test('login password input focused', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const password = page.locator('input[type="password"], input[name="password"]').first();
    if (await password.isVisible({ timeout: 3000 }).catch(() => false)) {
      await password.focus();
      await page.waitForTimeout(200);
    }
    await screenshotElement(page, 'form, [data-testid="login-form"], main', 'interact-forms-login-password-focused.png');
  });

  test('login form with filled values', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const email = page.locator('input[type="email"], input[name="email"], #username').first();
    const password = page.locator('input[type="password"], input[name="password"]').first();
    if (await email.isVisible({ timeout: 3000 }).catch(() => false)) {
      await email.fill('test@example.com');
    }
    if (await password.isVisible({ timeout: 3000 }).catch(() => false)) {
      await password.fill('password123');
    }
    await page.waitForTimeout(200);
    await screenshotElement(page, 'form, [data-testid="login-form"], main', 'interact-forms-login-filled.png');
  });

  test('login button hover state', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const btn = page.locator('[data-testid="dev-login-btn"], button[type="submit"], button:has-text("Sign")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.hover();
      await page.waitForTimeout(200);
    }
    await screenshotElement(page, 'form, [data-testid="login-form"], main', 'interact-forms-login-btn-hover.png');
  });
});

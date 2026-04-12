/**
 * Manual Prep Smoke Test — Real browser testing against live Docker services.
 *
 * Detects whether the app runs in DEV_MODE (dev-login button) or real Keycloak,
 * then performs the appropriate authentication before navigating to each page.
 *
 * Screenshots saved to: docs/screenshots/
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:5173';
const KEYCLOAK_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/screenshots');

const STUDENT = {
  email: 'student@example.com',
  password: 'Student123!',
};

/** Authenticate the page, handling both DEV_MODE and real Keycloak. */
async function authenticate(page: Page): Promise<'dev' | 'keycloak'> {
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  const isDevMode = await devBtn
    .waitFor({ timeout: 4_000 })
    .then(() => true)
    .catch(() => false);

  if (isDevMode) {
    await devBtn.click();
    await page
      .waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 20_000,
      })
      .catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    return 'dev';
  }

  // Real Keycloak path: wait for init to finish, then click "Sign in with Keycloak"
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 20_000 }
    )
    .catch(() => {});

  const signInBtn = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  await signInBtn.waitFor({ timeout: 15_000 });
  await signInBtn.click();

  await page
    .waitForURL(
      new RegExp(KEYCLOAK_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      { timeout: 25_000 }
    )
    .catch(() => {});

  // Fill Keycloak login form
  await page.locator('#username').waitFor({ timeout: 15_000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');

  // Wait for redirect back to app
  await page
    .waitForURL(new RegExp('localhost:5173'), { timeout: 30_000 })
    .catch(() => {});

  // Wait for auth initialisation to complete (spinner disappears)
  await page
    .waitForFunction(
      () =>
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 20_000 }
    )
    .catch(() => {});

  await page.waitForLoadState('domcontentloaded');
  return 'keycloak';
}

test.describe('Manual Prep Smoke — Live Docker Services', () => {
  test.setTimeout(120_000);

  test('01 — homepage loads', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
    });
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'manual-prep-01-homepage.png'),
      fullPage: true,
    });
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(50);
    console.log(`Homepage URL: ${page.url()}, content length: ${body!.length}`);
  });

  test('02 — login and post-login page', async ({ page }) => {
    const mode = await authenticate(page);
    console.log(`Auth mode: ${mode}`);

    // Wait for the app to settle after login
    await page.waitForTimeout(3_000);
    await page
      .waitForFunction(
        () =>
          !document.body.textContent?.includes(
            'Initializing authentication...'
          ),
        { timeout: 15_000 }
      )
      .catch(() => {});

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'manual-prep-02-post-login.png'),
      fullPage: true,
    });

    const currentUrl = page.url();
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    console.log(`Post-login URL: ${currentUrl}`);
  });

  test('03 — dashboard page', async ({ page }) => {
    // Authenticate first, then use client-side navigation to avoid full reload
    // which would re-trigger Keycloak init
    await authenticate(page);

    // Use client-side navigation via React Router instead of full page reload
    // to preserve the authenticated Keycloak session in memory
    await page.evaluate(() => {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Wait for auth spinner to disappear and real content to appear
    await page
      .waitForFunction(
        () =>
          !document.body.textContent?.includes(
            'Initializing authentication...'
          ),
        { timeout: 20_000 }
      )
      .catch(() => {});
    await page.waitForTimeout(3_000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'manual-prep-03-dashboard.png'),
      fullPage: true,
    });

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    console.log(`Dashboard URL: ${page.url()}`);
  });

  test('04 — courses page', async ({ page }) => {
    await authenticate(page);

    // Client-side navigation to /courses to preserve auth session
    await page.evaluate(() => {
      window.history.pushState({}, '', '/courses');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Wait for auth spinner to disappear
    await page
      .waitForFunction(
        () =>
          !document.body.textContent?.includes(
            'Initializing authentication...'
          ),
        { timeout: 20_000 }
      )
      .catch(() => {});
    await page.waitForTimeout(3_000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'manual-prep-04-courses.png'),
      fullPage: true,
    });

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    console.log(`Courses URL: ${page.url()}`);
  });
});

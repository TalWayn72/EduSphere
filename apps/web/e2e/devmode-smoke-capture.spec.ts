/**
 * DEV_MODE Smoke Capture
 *
 * Runs against the app in VITE_DEV_MODE=true (mock auth = auto-authenticated).
 * Captures screenshots of all major pages for visual verification.
 *
 * Run:
 *   VITE_DEV_MODE=true pnpm --filter @edusphere/web test:e2e \
 *     --project=chromium --grep "devmode-smoke"
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/screenshots');

async function capture(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage: false,
  });
}

/** Login helper: click "Sign In (Dev Mode)" and wait for authenticated route */
async function loginDevMode(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const btn = page.getByRole('button', { name: /Sign In \(Dev Mode\)/i });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
  // Wait for redirect to authenticated route
  await page.waitForURL(/\/(dashboard|courses|learn|admin)/, { timeout: 20_000 });
}

test.describe('devmode-smoke', () => {
  test('login page shows DEV_MODE banner', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await capture(page, 'auth-smoke-devmode-01-login.png');

    // Verify DEV_MODE banner and button
    await expect(page.getByText(/Dev Mode/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Sign In \(Dev Mode\)/i })).toBeVisible({ timeout: 5_000 });
    console.log('Login page URL:', page.url());
  });

  test('DEV_MODE login reaches dashboard', async ({ page }) => {
    await loginDevMode(page);
    await page.waitForTimeout(1500);
    await capture(page, 'auth-smoke-devmode-02-post-login.png');
    console.log('Post-login URL:', page.url());
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('dashboard page renders after login', async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await capture(page, 'auth-smoke-devmode-03-dashboard.png');

    const heading = page.getByRole('heading', { name: /dashboard/i });
    const hasHeading = await heading.isVisible({ timeout: 8_000 }).catch(() => false);
    console.log('Dashboard heading visible:', hasHeading);
    if (!hasHeading) {
      const bodyText = await page.locator('body').innerText().catch(() => 'N/A');
      console.log('Body text:', bodyText.slice(0, 300));
    }
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('courses page renders after login', async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await capture(page, 'auth-smoke-devmode-04-courses.png');
    console.log('Courses URL:', page.url());
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('knowledge graph page renders after login', async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/knowledge-graph');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await capture(page, 'auth-smoke-devmode-05-knowledge-graph.png');
    console.log('KG URL:', page.url());
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('admin page renders after login (SUPER_ADMIN role)', async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await capture(page, 'auth-smoke-devmode-06-admin.png');
    console.log('Admin URL:', page.url());
    // SUPER_ADMIN should access admin, not redirect to /login
    expect(page.url()).not.toMatch(/\/login/);
  });
});

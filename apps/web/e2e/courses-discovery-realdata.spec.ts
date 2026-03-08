/**
 * Courses Discovery — Real Data E2E regression guard (Phase 36)
 *
 * Verifies the /explore (CoursesDiscoveryPage) renders without mock-data
 * sentinel strings and correctly shows cards (real or skeleton) on load.
 *
 * Suite 1 — DEV_MODE (default, no backend required):
 *   Uses loginInDevMode shortcut. Asserts mock-sentinel strings are absent
 *   and that the page renders without crash.
 *
 * Suite 2 — Live backend (VITE_DEV_MODE=false):
 *   Real Keycloak login as student; asserts course cards visible and takes
 *   a visual snapshot for baseline comparison.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — mock-data sentinel guard ──────────────────────────────

test.describe('Courses Discovery Real Data — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('does not contain mock course sentinel strings in DOM', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Phase 36 regression: these strings must NEVER appear as hardcoded fallbacks
    expect(body).not.toContain('Introduction to Talmud Study');
    expect(body).not.toContain('MOCK_COURSES');
    expect(body).not.toContain('[object Object]');
  });

  test('page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('/discover alias also renders without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/discover`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('/courses/discover alias renders without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/discover`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — real API + visual regression ──────────────────────

test.describe('Courses Discovery Real Data — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('course cards or skeleton loaders are visible on load', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });

    // Either real course cards or skeleton placeholders must appear — never blank
    const cards = page.locator(
      '[data-testid="course-card"], [data-testid="skeleton-card"], [class*="skeleton"]'
    );
    await cards.first().waitFor({ timeout: 15_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('no mock sentinel strings in live-backend render', async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_COURSES');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Introduction to Talmud Study');
  });

  test('visual snapshot — courses discovery page', async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'courses-discovery-realdata-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});

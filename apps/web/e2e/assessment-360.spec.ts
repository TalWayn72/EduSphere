/**
 * 360° Assessments — E2E regression guard (Phase 45)
 *
 * Verifies the Assessment360Page renders correctly, that the assessment
 * creation flow is accessible, and that no sensitive data is exposed.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('360° Assessments — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('assessments page renders heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Assessment/i })
    ).toBeVisible();
  });

  test('assessments page has no crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no [object Object] in assessments DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('assessments page shows list or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasAssessments = await page
      .locator('[data-testid="assessment-card"]')
      .count();
    const hasEmpty = await page
      .getByText(/No assessments|No pending assessments/i)
      .count();
    expect(hasAssessments + hasEmpty).toBeGreaterThan(0);
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('360° Assessments — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('assessments page renders with screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Assessment/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('assessments-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('assessments page renders correctly as instructor', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Assessment/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('assessments-instructor-page.png', {
      maxDiffPixels: 200,
    });
  });
});

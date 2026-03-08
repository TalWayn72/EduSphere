/**
 * Instructor Onboarding Flow — E2E regression guard (Phase 37)
 *
 * Verifies that the OnboardingPage renders correctly for instructor users
 * with the instructor-specific 4-step wizard.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Instructor Onboarding — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('/onboarding page renders without crash overlay (instructor context)', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no MOCK_ sentinel strings in instructor onboarding DOM', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });
});

// ── Suite 2: Live backend — instructor wizard + visual regression ─────────────

test.describe('Instructor Onboarding — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
  });

  test('/onboarding page renders instructor wizard for instructor role', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should not show raw MOCK_ strings
    const content = await page.content();
    expect(content).not.toContain('MOCK_');

    await expect(page).toHaveScreenshot('onboarding-instructor-step1.png', {
      maxDiffPixels: 200,
    });
  });

  test('no [object Object] serialization in instructor onboarding DOM', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });
});

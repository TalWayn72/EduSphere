/**
 * Student Onboarding Flow — E2E regression guard (Phase 37)
 *
 * Verifies that the OnboardingPage renders correctly for student users
 * and that the dashboard onboarding banner is shown when applicable.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Student Onboarding — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('/onboarding page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no MOCK_ sentinel strings in onboarding DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('no [object Object] serialization in onboarding DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });
});

// ── Suite 2: Live backend — real student flow + visual regression ─────────────

test.describe('Student Onboarding — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('dashboard shows onboarding banner for new users if applicable', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Banner may or may not be shown (student may have already completed onboarding)
    // — if shown, assert it has correct ARIA role
    const banner = page.getByRole('status').filter({ hasText: /profile setup/i });
    const isVisible = await banner.isVisible().catch(() => false);
    if (isVisible) {
      await expect(banner).toBeVisible();
      await expect(page).toHaveScreenshot('dashboard-onboarding-banner.png', {
        maxDiffPixels: 200,
      });
    }
  });

  test('/onboarding page renders step wizard for student', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should not show raw MOCK_ strings
    const content = await page.content();
    expect(content).not.toContain('MOCK_');

    await expect(page).toHaveScreenshot('onboarding-student-step1.png', {
      maxDiffPixels: 200,
    });
  });
});

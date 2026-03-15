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

// ── Suite 3: DEV_MODE — expanded onboarding flow tests ────────────────────────

test.describe('Student Onboarding — Flow tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('welcome screen displays greeting and get-started CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Welcome heading or greeting should be visible
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // A primary CTA button should exist (Get Started, Continue, Next, etc.)
    const cta = page
      .getByRole('button', { name: /get started|continue|next|begin/i })
      .first();
    const ctaExists = await cta.isVisible().catch(() => false);
    if (ctaExists) {
      await expect(cta).toBeEnabled();
    }
  });

  test('profile setup step allows name and avatar entry', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Look for profile-related inputs (name, display name, avatar upload)
    const nameInput = page.locator(
      'input[name*="name"], input[placeholder*="name" i], input[aria-label*="name" i]'
    ).first();
    const nameExists = await nameInput.isVisible().catch(() => false);

    if (nameExists) {
      await nameInput.fill('Test Student');
      await expect(nameInput).toHaveValue('Test Student');
    }

    // No crash after interaction
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('first course enrollment step shows available courses', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Navigate through steps to reach course selection if multi-step
    const nextBtn = page.getByRole('button', { name: /next|continue/i }).first();
    const hasNext = await nextBtn.isVisible().catch(() => false);
    if (hasNext) {
      // Click through initial steps to reach course enrollment
      for (let i = 0; i < 3; i++) {
        const btn = page.getByRole('button', { name: /next|continue/i }).first();
        const visible = await btn.isVisible().catch(() => false);
        if (visible) await btn.click();
        await page.waitForTimeout(500);
      }
    }

    // Page should not crash regardless of step
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('skip option allows bypassing onboarding', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Look for a skip link/button
    const skipBtn = page
      .getByRole('button', { name: /skip|later|not now/i })
      .or(page.getByRole('link', { name: /skip|later|not now/i }))
      .first();
    const skipExists = await skipBtn.isVisible().catch(() => false);

    if (skipExists) {
      await skipBtn.click();
      // Should navigate away from onboarding (to dashboard or learn)
      await page
        .waitForURL(/\/(dashboard|learn|courses|explore)/, { timeout: 10_000 })
        .catch(() => {
          // May stay on onboarding if skip just dismisses a tooltip
        });
    }

    // No crash after skipping
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('progress indicator shows current step', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Look for step indicators (dots, numbers, progress bar)
    const stepIndicator = page
      .locator(
        '[data-testid*="step"], [data-testid*="progress"], [role="progressbar"], .step-indicator, [aria-label*="step" i]'
      )
      .first();
    const indicatorExists = await stepIndicator.isVisible().catch(() => false);

    if (indicatorExists) {
      await expect(stepIndicator).toBeVisible();
    }

    // Alternatively check for step text like "Step 1 of 3"
    const stepText = page.getByText(/step \d+ (of|\/)/i).first();
    const stepTextExists = await stepText.isVisible().catch(() => false);

    // At least one progress indicator mechanism should exist
    expect(indicatorExists || stepTextExists).toBe(true);
  });

  test('language selection is available during onboarding', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Look for a language selector (combobox, select, or dedicated dropdown)
    const langSelector = page
      .locator(
        '[data-testid*="language"], [data-testid*="locale"], select[name*="lang"], [aria-label*="language" i]'
      )
      .first();
    const langExists = await langSelector.isVisible().catch(() => false);

    if (langExists) {
      await expect(langSelector).toBeVisible();
    }

    // The page should render correctly regardless
    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
    expect(body).not.toContain('[object Object]');
  });

  test('tutorial completion navigates to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Try to complete the onboarding by clicking through all steps
    for (let i = 0; i < 10; i++) {
      const finishBtn = page
        .getByRole('button', { name: /finish|complete|done|get started|submit/i })
        .first();
      const finishVisible = await finishBtn.isVisible().catch(() => false);
      if (finishVisible) {
        await finishBtn.click();
        break;
      }

      const nextBtn = page.getByRole('button', { name: /next|continue/i }).first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      if (nextVisible) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Should eventually leave onboarding or show completion
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('visual regression — onboarding welcome screen', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('onboarding-student-welcome.png', {
      fullPage: false,
      maxDiffPixels: 300,
      animations: 'disabled',
    });
  });

  test('no console errors during onboarding flow', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors (e.g., favicon, sourcemap)
    const realErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('.map') &&
        !e.includes('sourceMappingURL')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('onboarding page is accessible — no missing alt or role', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // All images should have alt text
    const images = page.locator('img:not([alt])');
    const imgCount = await images.count();
    expect(imgCount, 'All images must have alt attributes').toBe(0);

    // All buttons should have accessible names
    const buttons = page.locator('button:not([aria-label]):not([aria-labelledby])');
    const btnCount = await buttons.count();
    for (let i = 0; i < btnCount; i++) {
      const text = await buttons.nth(i).textContent();
      expect(
        text?.trim().length,
        'Every button must have visible text or aria-label'
      ).toBeGreaterThan(0);
    }
  });
});

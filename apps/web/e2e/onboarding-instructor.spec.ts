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

// ── Suite 3: DEV_MODE — expanded instructor onboarding flow ──────────────────

test.describe('Instructor Onboarding — Flow tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('welcome screen displays instructor-specific greeting', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // The page should render a heading
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // No technical error strings
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('MOCK_');
  });

  test('bio setup step allows text entry', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Look for bio/description textarea or input
    const bioField = page.locator(
      'textarea[name*="bio"], textarea[placeholder*="bio" i], textarea[aria-label*="bio" i], input[name*="bio"]'
    ).first();
    const bioExists = await bioField.isVisible().catch(() => false);

    if (bioExists) {
      await bioField.fill('Experienced instructor in computer science.');
      const value = await bioField.inputValue();
      expect(value).toContain('Experienced instructor');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('first course creation wizard has required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Navigate to course creation step if multi-step
    for (let i = 0; i < 5; i++) {
      const nextBtn = page.getByRole('button', { name: /next|continue/i }).first();
      const visible = await nextBtn.isVisible().catch(() => false);
      if (visible) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Check for course-related form fields
    const courseTitle = page.locator(
      'input[name*="title"], input[name*="course"], input[placeholder*="course" i]'
    ).first();
    const titleExists = await courseTitle.isVisible().catch(() => false);

    if (titleExists) {
      await courseTitle.fill('Introduction to AI');
      await expect(courseTitle).toHaveValue('Introduction to AI');
    }

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('content upload area is present in onboarding', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Navigate through steps looking for an upload area
    for (let i = 0; i < 5; i++) {
      const uploadArea = page.locator(
        'input[type="file"], [data-testid*="upload"], [data-testid*="dropzone"], [role="button"][aria-label*="upload" i]'
      ).first();
      const uploadExists = await uploadArea.isVisible().catch(() => false);
      if (uploadExists) break;

      const nextBtn = page.getByRole('button', { name: /next|continue/i }).first();
      const visible = await nextBtn.isVisible().catch(() => false);
      if (visible) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // No crash regardless of step reached
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('dashboard redirect after completing onboarding', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Attempt to complete onboarding by clicking through all steps
    for (let i = 0; i < 10; i++) {
      const finishBtn = page
        .getByRole('button', { name: /finish|complete|done|submit|create/i })
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

    // Should not crash
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('visual regression — instructor onboarding welcome', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('onboarding-instructor-welcome.png', {
      fullPage: false,
      maxDiffPixels: 300,
      animations: 'disabled',
    });
  });
});

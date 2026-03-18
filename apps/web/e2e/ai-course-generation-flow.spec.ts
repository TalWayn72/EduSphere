import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

/**
 * BUG-089: AI Course Generation — full end-to-end flow.
 *
 * Verifies the user can:
 * 1. Enable AI consent in Settings
 * 2. Navigate to /courses/new → Launch AI Builder
 * 3. Fill in a prompt and click Generate Course
 * 4. Generation succeeds (no error message)
 *
 * This test was written BEFORE the fix to capture the failure.
 * The original error: "יצירת מתווה הקורס נכשלה. נסה שוב." /
 * "Course outline creation failed. Try again."
 */

// Button text patterns — covers all 10 supported locales
const LAUNCH_AI_BUILDER_RE =
  /Launch AI Builder|הפעל בונה AI|Lanzar Constructor|Lancer le Constructeur|AI बिल्डर|AI 构建器|Запустить AI/i;
const GENERATE_COURSE_RE =
  /Generate Course|צור קורס|Generar Curso|Générer le Cours|कोर्स बनाएं|生成课程|Создать курс|Buat Kursus/i;

test.describe('AI Course Generation Flow', () => {
  // Run serially — both tests login as the same Keycloak user;
  // parallel workers trigger brute-force lockout.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('BUG-089: full flow — consent ON → generate course → no error', async ({ page }) => {
    // ─── Step 1: Ensure AI consent is ON ───
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const aiToggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(aiToggle).toBeVisible({ timeout: 15_000 });
    const consentState = await aiToggle.getAttribute('aria-checked');

    if (consentState === 'false') {
      await aiToggle.click();
      await page.waitForTimeout(3000);

      // Verify consent saved successfully (no error toast)
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToast).not.toBeVisible({ timeout: 2_000 });

      const newState = await aiToggle.getAttribute('aria-checked');
      expect(newState).toBe('true');
    }

    // ─── Step 2: Navigate to /courses/new ───
    await page.goto('/courses/new');
    await page.waitForLoadState('networkidle');

    // ─── Step 3: Click "Launch AI Builder" ───
    const launchBtn = page
      .locator('button, a')
      .filter({ hasText: LAUNCH_AI_BUILDER_RE })
      .first();
    await expect(launchBtn).toBeVisible({ timeout: 15_000 });
    await launchBtn.click();
    await page.waitForTimeout(1000);

    // ─── Step 4: Verify modal opened without consent warning ───
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Consent warning should NOT be visible (we enabled consent in step 1)
    const consentWarning = page.locator('[data-testid="requirement-link"]');
    await expect(consentWarning).not.toBeVisible({ timeout: 3_000 });

    // ─── Step 5: Fill in the prompt ───
    const textarea = modal.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('Introduction to basic mathematics for beginners');

    // ─── Step 6: Click Generate Course ───
    const generateBtn = modal
      .locator('button')
      .filter({ hasText: GENERATE_COURSE_RE })
      .first();
    await expect(generateBtn).toBeVisible({ timeout: 5_000 });
    await expect(generateBtn).toBeEnabled({ timeout: 3_000 });
    await generateBtn.click();

    // ─── Step 7: Wait and verify — NO error message ───
    await page.waitForTimeout(5000);

    // The error message that appears when generation fails:
    // Hebrew: "יצירת מתווה הקורס נכשלה. נסה שוב."
    // English: "Course outline creation failed. Try again."
    const errorMsg = page.locator(
      'text=/נכשלה|failed|Course outline creation failed/i',
    );
    const errorVisible = await errorMsg.isVisible().catch(() => false);

    // This is the critical assertion:
    // If this fails, it means course generation is broken even after consent is granted
    expect(errorVisible).toBe(false);
  });

  test('BUG-089: generateCourseFromPrompt mutation returns valid response', async ({ page }) => {
    // This test intercepts the actual GraphQL mutation to verify
    // the backend returns a valid response (not an error)

    let mutationResponse: Record<string, unknown> | null = null;
    let mutationError: string | null = null;

    page.on('response', async (response) => {
      if (response.url().includes('/graphql')) {
        try {
          const body = await response.json();
          if (body?.data?.generateCourseFromPrompt) {
            mutationResponse = body.data.generateCourseFromPrompt;
          }
          if (body?.errors) {
            const err = body.errors[0];
            if (
              err?.path?.includes('generateCourseFromPrompt') ||
              err?.message?.includes('generateCourse')
            ) {
              mutationError = err.message;
            }
          }
        } catch {
          // ignore
        }
      }
    });

    // Ensure consent is on
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const aiToggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(aiToggle).toBeVisible({ timeout: 15_000 });
    if ((await aiToggle.getAttribute('aria-checked')) === 'false') {
      await aiToggle.click();
      await page.waitForTimeout(3000);
    }

    // Navigate to courses/new and open AI builder
    await page.goto('/courses/new');
    await page.waitForLoadState('networkidle');

    const launchBtn = page
      .locator('button, a')
      .filter({ hasText: LAUNCH_AI_BUILDER_RE })
      .first();
    await expect(launchBtn).toBeVisible({ timeout: 15_000 });
    await launchBtn.click();
    await page.waitForTimeout(1000);

    // Fill prompt and generate
    const modal = page.locator('[role="dialog"]');
    const textarea = modal.locator('textarea').first();
    await textarea.fill('Introduction to basic mathematics');

    const generateBtn = modal
      .locator('button')
      .filter({ hasText: GENERATE_COURSE_RE })
      .first();
    await expect(generateBtn).toBeEnabled({ timeout: 3_000 });
    await generateBtn.click();

    // Wait for mutation response
    await page.waitForTimeout(8000);

    // Verify: mutation should NOT have returned an error
    expect(mutationError).toBeNull();

    // Verify: mutation should have returned a valid response with executionId
    expect(mutationResponse).not.toBeNull();
    if (mutationResponse) {
      expect(mutationResponse).toHaveProperty('executionId');
      expect(mutationResponse).toHaveProperty('status');
    }
  });
});

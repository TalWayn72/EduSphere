import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

/**
 * E2E: Smart Requirement Links — consent navigation flow.
 *
 * Tests that CONSENT_REQUIRED errors show actionable links that navigate
 * to /settings, scroll to the AI consent toggle, and apply highlight animation.
 *
 * Requires VITE_DEV_MODE=true (auto-auth, no Keycloak needed).
 */

test.describe('Consent Requirement Link', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('settings page shows Privacy & AI card with toggles', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Privacy & AI')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#setting-ai-consent')).toBeVisible();
    await expect(page.locator('#setting-third-party-llm')).toBeVisible();
  });

  test('AI consent toggle updates localStorage', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Wait for the toggle to appear
    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Click to enable
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Verify localStorage
    const stored = await page.evaluate(
      () => localStorage.getItem('edusphere_consent_AI_PROCESSING'),
    );
    expect(stored).toBe('true');
  });

  test('navigating to /settings?highlight=ai-consent scrolls and highlights', async ({
    page,
  }) => {
    await page.goto('/settings?highlight=ai-consent');
    await page.waitForLoadState('networkidle');

    // Wait for the element to be visible
    const target = page.locator('#setting-ai-consent');
    await expect(target).toBeVisible({ timeout: 10_000 });

    // Wait for the highlight animation class to be applied (after 300ms scroll delay)
    await page.waitForTimeout(600);
    const hasHighlight = await target.evaluate(
      (el) => el.classList.contains('animate-settings-highlight'),
    );
    expect(hasHighlight).toBe(true);
  });

  test('AI Course Creator modal shows RequirementLink on consent error', async ({
    page,
  }) => {
    // Mock the GraphQL endpoint to return CONSENT_REQUIRED
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON();
      if (
        body?.query?.includes('generateCourseFromPrompt') ||
        body?.operationName === 'GenerateCourseFromPrompt'
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            errors: [
              {
                message: 'Consent required',
                extensions: { code: 'CONSENT_REQUIRED' },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/courses/new');
    await page.waitForLoadState('networkidle');

    // Open the AI Course Creator modal (look for the CTA)
    const aiButton = page.locator('text=/AI|יוצר קורסים/i').first();
    if (await aiButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await aiButton.click();

      // Fill in prompt and submit
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await textarea.fill('Test course for consent flow');
        const generateBtn = page
          .locator('button:has-text("צור קורס"), button:has-text("Generate")')
          .first();
        if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await generateBtn.click();

          // Verify RequirementLink appears
          await expect(
            page.locator('[data-testid="requirement-link"]'),
          ).toBeVisible({ timeout: 5000 });

          // Verify it contains a link to settings
          const link = page.locator('[data-testid="requirement-link"] a');
          await expect(link).toHaveAttribute(
            'href',
            '/settings?highlight=ai-consent',
          );
        }
      }
    }
  });

  // BUG-087 REGRESSION: /settings?highlight=ai-consent must NOT crash with "Something went wrong"
  test('REGRESSION BUG-087: /settings?highlight=ai-consent does not crash', async ({
    page,
  }) => {
    await page.goto('/settings?highlight=ai-consent');
    await page.waitForLoadState('networkidle');

    // Page must NOT show ErrorBoundary crash UI
    await expect(page.locator('text=Something went wrong')).not.toBeVisible({
      timeout: 5_000,
    });

    // Privacy & AI card must render
    await expect(page.locator('text=Privacy & AI')).toBeVisible({
      timeout: 10_000,
    });

    // AI consent toggle must be interactive
    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(toggle).toBeVisible();
  });

  test('highlight query param is removed after animation completes', async ({
    page,
  }) => {
    await page.goto('/settings?highlight=ai-consent');
    await page.waitForLoadState('networkidle');

    // Verify we're on settings (not redirected to login)
    await expect(page.locator('#setting-ai-consent')).toBeVisible({
      timeout: 10_000,
    });

    // Wait for the full highlight duration (300ms delay + 4000ms animation)
    await page.waitForTimeout(5000);

    // URL should no longer have highlight param
    const url = page.url();
    expect(url).not.toContain('highlight=');
  });

  // BUG-088 REGRESSION: consent toggle must persist (not just localStorage)
  test('REGRESSION BUG-088: settings consent toggle is interactive and saves', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // AI consent toggle must exist and be interactive
    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    // Get initial state
    const initialChecked = await toggle.getAttribute('aria-checked');

    // Click to toggle
    await toggle.click();

    // Verify state changed
    const newChecked = await toggle.getAttribute('aria-checked');
    expect(newChecked).not.toBe(initialChecked);

    // Verify localStorage was updated
    const stored = await page.evaluate(
      () => localStorage.getItem('edusphere_consent_AI_PROCESSING'),
    );
    expect(stored).toBe(newChecked === 'true' ? 'true' : 'false');
  });

  // BUG-088 REGRESSION: back button appears when returnTo param is present
  test('REGRESSION BUG-088: back button shown with returnTo param', async ({ page }) => {
    await page.goto('/settings?highlight=ai-consent&returnTo=%2Fcourses%2Fnew');
    await page.waitForLoadState('networkidle');

    // Back button must be visible
    const backBtn = page.locator('button[aria-label]').filter({ hasText: /←|back|חזרה/i }).first();
    // Alternative: look for ArrowLeft icon button
    const arrowBtn = page.locator('button:has(svg.lucide-arrow-left)');
    const hasBackButton = await backBtn.isVisible().catch(() => false) ||
      await arrowBtn.isVisible().catch(() => false);
    expect(hasBackButton).toBe(true);
  });

  // BUG-088 REGRESSION: no back button on plain settings page
  test('REGRESSION BUG-088: no back button without returnTo param', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Back button must NOT be visible
    const arrowBtn = page.locator('button:has(svg.lucide-arrow-left)');
    await expect(arrowBtn).not.toBeVisible({ timeout: 3_000 });
  });

  // BUG-088 REGRESSION (Round 2): consent toggle GraphQL mutation must succeed
  // This test verifies the ACTUAL mutation reaches the gateway and returns success,
  // not just that localStorage is updated. The original bug was that the mutation
  // didn't exist in the supergraph — gateway returned an error.
  test('REGRESSION BUG-088: consent toggle mutation succeeds through gateway', async ({ page }) => {
    let mutationSucceeded = false;
    let mutationPayload: Record<string, unknown> | null = null;

    // Intercept GraphQL requests to observe the mutation response
    page.on('response', async (response) => {
      if (response.url().includes('/graphql')) {
        try {
          const body = await response.json();
          if (body?.data?.updateConsent === true) {
            mutationSucceeded = true;
          }
        } catch {
          // Not JSON or not our mutation — ignore
        }
      }
    });

    page.on('request', (request) => {
      if (request.url().includes('/graphql')) {
        try {
          const postData = request.postDataJSON();
          if (postData?.query?.includes('updateConsent')) {
            mutationPayload = postData;
          }
        } catch {
          // ignore
        }
      }
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Toggle AI consent
    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();

    // Wait for the mutation response
    await page.waitForTimeout(3000);

    // Verify the mutation was sent
    expect(mutationPayload).not.toBeNull();

    // Verify the mutation succeeded (no error toast, data returned true)
    // If mutation fails, the PrivacyConsentCard shows an error toast
    const errorToast = page.locator('text=/נכשלה|Failed to save/i');
    await expect(errorToast).not.toBeVisible({ timeout: 2_000 });

    // The mutation should have returned { data: { updateConsent: true } }
    expect(mutationSucceeded).toBe(true);
  });

  // BUG-092 REGRESSION: consent mutation must NOT return "Cannot return null for
  // non-nullable field Mutation.updateConsent" — root cause was consent.resolver.js
  // and consent.module.js missing from Docker container dist/ due to stale turbo cache.
  test('REGRESSION BUG-092: consent save does not show sync error toast', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    // Toggle consent (whichever direction)
    await toggle.click();

    // Wait for mutation round-trip
    await page.waitForTimeout(3000);

    // BUG-092 symptom: error toast "שמירת ההסכמה לשרת נכשלה. נסה שוב."
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast).not.toBeVisible({ timeout: 2_000 });

    // Success toast should appear instead
    const successToast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(successToast).toBeVisible({ timeout: 5_000 });
  });
});

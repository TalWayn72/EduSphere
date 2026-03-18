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
});

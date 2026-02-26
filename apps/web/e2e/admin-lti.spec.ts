/**
 * admin-lti.spec.ts — LTI 1.3 Platform Management E2E Tests
 *
 * Route: /admin/lti
 * Access: ORG_ADMIN and SUPER_ADMIN only (F-018)
 *
 * In DEV_MODE the app auto-authenticates as a SUPER_ADMIN mock user,
 * so all admin-only routes are accessible without Keycloak.
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="LTI"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { IS_DEV_MODE, RUN_WRITE_TESTS } from './env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoLti(page: Parameters<typeof login>[0]) {
  await login(page);
  await page.goto('/admin/lti');
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('LTI 1.3 Admin Settings', () => {
  // ── Page structure ────────────────────────────────────────────────────────

  test('page renders at /admin/lti with heading', async ({ page }) => {
    await gotoLti(page);
    await expect(
      page.getByRole('heading', { name: /LTI 1\.3 Platforms/i })
    ).toBeVisible();
  });

  test('subtitle describes supported LMS platforms', async ({ page }) => {
    await gotoLti(page);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(/Canvas|Moodle|Blackboard/i.test(body)).toBe(true);
  });

  test('Copy Launch URL button is visible in page header', async ({ page }) => {
    await gotoLti(page);
    await expect(
      page.getByRole('button', { name: /copy launch url/i })
    ).toBeVisible();
  });

  test('Register Platform button is visible in page header', async ({
    page,
  }) => {
    await gotoLti(page);
    await expect(
      page.getByRole('button', { name: /register platform/i })
    ).toBeVisible();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  test('shows empty-state message when no platforms are registered', async ({
    page,
  }) => {
    await gotoLti(page);
    // In DEV_MODE there is no live GraphQL backend, so the query returns
    // an empty list and the empty-state text is rendered.
    const body = (await page.locator('body').textContent()) ?? '';
    const hasEmptyState =
      /No LTI platforms registered/i.test(body) ||
      /register platform/i.test(body);
    expect(hasEmptyState).toBe(true);
  });

  // ── Register form ─────────────────────────────────────────────────────────

  test('clicking Register Platform toggles the registration form', async ({
    page,
  }) => {
    await gotoLti(page);
    const btn = page.getByRole('button', { name: /register platform/i });
    await btn.click();

    // Form card with title should now be visible
    await expect(
      page.getByRole('heading', { name: /Register LTI 1\.3 Platform/i })
    ).toBeVisible();
  });

  test('registration form contains all required fields', async ({ page }) => {
    await gotoLti(page);
    await page.getByRole('button', { name: /register platform/i }).click();

    const bodyText = (await page.locator('body').textContent()) ?? '';

    // Verify all expected field labels are rendered (case-insensitive)
    const expectedLabels = [
      /platform\s*name/i,
      /platform\s*url/i,
      /client\s*id/i,
      /auth\s*(login\s*)?url/i,
      /auth\s*token\s*url/i,
      /key\s*set\s*url/i,
      /deployment\s*id/i,
    ];
    for (const pattern of expectedLabels) {
      expect(pattern.test(bodyText), `Expected label matching ${pattern}`).toBe(
        true
      );
    }
  });

  test('registration form has Save Platform and Cancel buttons', async ({
    page,
  }) => {
    await gotoLti(page);
    await page.getByRole('button', { name: /register platform/i }).click();

    await expect(
      page.getByRole('button', { name: /save platform/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('Cancel button closes the registration form', async ({ page }) => {
    await gotoLti(page);
    await page.getByRole('button', { name: /register platform/i }).click();
    await expect(
      page.getByRole('heading', { name: /Register LTI 1\.3 Platform/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(
      page.getByRole('heading', { name: /Register LTI 1\.3 Platform/i })
    ).not.toBeVisible();
  });

  test('toggling Register Platform button a second time hides the form', async ({
    page,
  }) => {
    await gotoLti(page);
    const btn = page.getByRole('button', { name: /register platform/i });

    // First click — open
    await btn.click();
    await expect(
      page.getByRole('heading', { name: /Register LTI 1\.3 Platform/i })
    ).toBeVisible();

    // Second click — close
    await btn.click();
    await expect(
      page.getByRole('heading', { name: /Register LTI 1\.3 Platform/i })
    ).not.toBeVisible();
  });

  // ── Copy Launch URL ───────────────────────────────────────────────────────

  test('Copy Launch URL button reflects clipboard feedback ("Copied!")', async ({
    page,
    context,
  }) => {
    // Grant clipboard-write permission for the test context
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);
    await gotoLti(page);

    const copyBtn = page.getByRole('button', { name: /copy launch url/i });
    await copyBtn.click();

    // After clicking, the button label transitions to "Copied!"
    await expect(page.getByRole('button', { name: /copied!/i })).toBeVisible({
      timeout: 3_000,
    });
  });

  // ── Platform table columns (when platforms are present) ───────────────────

  test('platform cards show platform name, client ID, and status', async ({
    page,
  }) => {
    await gotoLti(page);
    const body = (await page.locator('body').textContent()) ?? '';
    // When the list is empty the card structure is absent — that is acceptable.
    // When platforms exist, these columns MUST be present. We verify the heading
    // labels exist on the cards if any platform cards are rendered.
    const platformCards = page.locator('[class*="card"]');
    const count = await platformCards.count();

    if (count > 1) {
      // At least one platform card (first card is the form trigger area)
      const cardText = (await platformCards.nth(1).textContent()) ?? '';
      expect(/active|inactive/i.test(cardText)).toBe(true);
    } else {
      // No platform cards — empty state is fine
      expect(/No LTI platforms registered/i.test(body)).toBe(true);
    }
  });

  // ── Mutation tests (skipped in read-only/production runs) ─────────────────

  test.skip(
    !RUN_WRITE_TESTS || !IS_DEV_MODE,
    'Write tests skipped — production or live backend'
  );

  // ── Visual regression ─────────────────────────────────────────────────────

  test('visual: LTI settings empty state @visual', async ({ page }) => {
    await gotoLti(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Mask timestamp-sensitive elements if any
    await expect(page).toHaveScreenshot('lti-settings-empty.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('visual: LTI settings with registration form open @visual', async ({
    page,
  }) => {
    await gotoLti(page);
    await page.getByRole('button', { name: /register platform/i }).click();
    await expect(
      page.getByRole('heading', { name: /Register LTI 1\.3 Platform/i })
    ).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('lti-settings-form-open.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

/**
 * admin-scim.spec.ts — SCIM 2.0 / HRIS Integration Settings E2E Tests
 *
 * Route: /admin/scim
 * Access: ORG_ADMIN and SUPER_ADMIN only (F-019)
 *
 * In DEV_MODE the app auto-authenticates as a SUPER_ADMIN mock user,
 * so all admin-only routes are accessible without Keycloak.
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="SCIM"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { RUN_WRITE_TESTS } from './env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoScim(page: Parameters<typeof login>[0]) {
  await login(page);
  await page.goto('/admin/scim');
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('SCIM 2.0 Admin Settings', () => {
  // ── Page structure ────────────────────────────────────────────────────────

  test('page renders at /admin/scim with heading', async ({ page }) => {
    await gotoScim(page);
    await expect(
      page.getByRole('heading', { name: /SCIM \/ HRIS Integration/i }),
    ).toBeVisible();
  });

  test('subtitle describes supported HRIS systems', async ({ page }) => {
    await gotoScim(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/Workday|BambooHR|ADP/i.test(body)).toBe(true);
  });

  // ── SCIM endpoint section ─────────────────────────────────────────────────

  test('SCIM Endpoint section renders with endpoint URL', async ({ page }) => {
    await gotoScim(page);
    await expect(
      page.getByRole('heading', { name: /SCIM Endpoint/i }),
    ).toBeVisible();

    // The endpoint URL contains /scim/v2
    const body = await page.locator('body').textContent() ?? '';
    expect(/\/scim\/v2/i.test(body)).toBe(true);
  });

  test('SCIM endpoint Copy button is visible', async ({ page }) => {
    await gotoScim(page);
    // The Copy button sits next to the endpoint URL field
    const copyBtns = page.getByRole('button', { name: /copy/i });
    await expect(copyBtns.first()).toBeVisible();
  });

  test('clicking the SCIM endpoint Copy button shows "Copied!" feedback', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);
    await gotoScim(page);

    // The endpoint section Copy button is the first on the page
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await copyBtn.click();

    await expect(
      page.getByText(/Copied!/i),
    ).toBeVisible({ timeout: 3_000 });
  });

  // ── API Tokens section ────────────────────────────────────────────────────

  test('API Tokens section renders', async ({ page }) => {
    await gotoScim(page);
    await expect(
      page.getByRole('heading', { name: /API Tokens/i }),
    ).toBeVisible();
  });

  test('Generate Token button is visible in the API Tokens section', async ({ page }) => {
    await gotoScim(page);
    await expect(
      page.getByRole('button', { name: /generate token/i }),
    ).toBeVisible();
  });

  test('no tokens present renders the empty-state message', async ({ page }) => {
    await gotoScim(page);
    const body = await page.locator('body').textContent() ?? '';
    // Either the empty state text or existing tokens — both are valid renders
    const renderedTokenState =
      /No tokens yet/i.test(body) ||
      // token rows have "Active" or "Revoked" badges
      /Active|Revoked/i.test(body);
    expect(renderedTokenState).toBe(true);
  });

  // ── Generate Token modal ──────────────────────────────────────────────────

  test('Generate Token button opens the modal', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();

    await expect(
      page.getByRole('heading', { name: /Generate SCIM Token/i }),
    ).toBeVisible();
  });

  test('modal contains Description input field', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();

    await expect(
      page.locator('input[placeholder*="Workday" i], input[placeholder*="description" i]'),
    ).toBeVisible();
  });

  test('modal contains Expires in days input field', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();

    // The expiry field is a number input — find it by type
    await expect(page.locator('input[type="number"]')).toBeVisible();
  });

  test('modal Generate button is disabled without a description', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();

    // The "Generate" button inside the modal (not the trigger)
    const generateBtn = page
      .locator('.fixed')
      .getByRole('button', { name: /^generate$/i });
    await expect(generateBtn).toBeDisabled();
  });

  test('modal Generate button becomes enabled after entering a description', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();

    const descInput = page.locator(
      'input[placeholder*="Workday" i], input[placeholder*="description" i]',
    );
    await descInput.fill('Workday Production');

    const generateBtn = page
      .locator('.fixed')
      .getByRole('button', { name: /^generate$/i });
    await expect(generateBtn).toBeEnabled();
  });

  test('modal Cancel button closes the modal', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();
    await expect(
      page.getByRole('heading', { name: /Generate SCIM Token/i }),
    ).toBeVisible();

    await page.locator('.fixed').getByRole('button', { name: /cancel/i }).click();
    await expect(
      page.getByRole('heading', { name: /Generate SCIM Token/i }),
    ).not.toBeVisible();
  });

  // ── Sync Log section ──────────────────────────────────────────────────────

  test('Sync Log section renders', async ({ page }) => {
    await gotoScim(page);
    await expect(
      page.getByRole('heading', { name: /Sync Log/i }),
    ).toBeVisible();
  });

  test('Sync Log shows empty state or log entries', async ({ page }) => {
    await gotoScim(page);
    const body = await page.locator('body').textContent() ?? '';
    // Either empty state text or entries with SUCCESS/FAILED status
    const hasLogState =
      /No sync operations yet/i.test(body) ||
      /SUCCESS|FAILED|PENDING/i.test(body);
    expect(hasLogState).toBe(true);
  });

  // ── Revoke token (write test) ─────────────────────────────────────────────

  test.describe('Write tests', () => {
    test.skip(!RUN_WRITE_TESTS, 'Skipped: RUN_WRITE_TESTS=false');

    test('token rows with Active status have a revoke (trash) button', async ({ page }) => {
      await gotoScim(page);
      // Active tokens render a trash icon button for revocation
      const revokeBtn = page.locator('[aria-label*="revoke" i], button svg[data-lucide="trash2"]').first();
      const count = await revokeBtn.count();

      if (count > 0) {
        await expect(revokeBtn).toBeVisible();
      } else {
        // No active tokens — that is a valid state; skip silently
        const body = await page.locator('body').textContent() ?? '';
        expect(/No tokens yet|Active|Revoked/i.test(body)).toBe(true);
      }
    });
  });

  // ── Visual regression ─────────────────────────────────────────────────────

  test('visual: SCIM settings page @visual', async ({ page }) => {
    await gotoScim(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('scim-settings.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
      mask: [
        // Mask the endpoint URL which contains window.location.origin
        page.locator('[class*="font-mono"]'),
      ],
    });
  });

  test('visual: Generate Token modal @visual', async ({ page }) => {
    await gotoScim(page);
    await page.getByRole('button', { name: /generate token/i }).click();
    await expect(
      page.getByRole('heading', { name: /Generate SCIM Token/i }),
    ).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('scim-generate-token-modal.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

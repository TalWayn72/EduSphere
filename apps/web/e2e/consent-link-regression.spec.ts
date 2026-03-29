/**
 * consent-link-regression.spec.ts — Consent Link Regression E2E Tests
 *
 * BUG: AI Course Creator modal showed consent warning text but WITHOUT a
 * clickable link to navigate to settings. Root cause: stale container build
 * from 2026-03-17 did not include FEAT-066 RequirementLink component.
 *
 * This spec guards against the link disappearing again by verifying:
 *   1. RequirementLink (data-testid="requirement-link") is visible in the modal
 *   2. The link text is present and clickable
 *   3. Clicking the link navigates to /settings?highlight=ai-consent
 *   4. The consent warning is NOT just plain text (must contain an <a> element)
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/consent-link-regression.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Setup ──────────────────────────────────────────────────────────────────

test.describe('Consent Link — RequirementLink in AI Course Creator Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GraphQL to avoid needing a live backend
    await routeGraphQL(page, () => null);

    await login(page);

    // Ensure consent is NOT granted so the RequirementLink shows
    await page.evaluate(() => {
      localStorage.removeItem('edusphere_consent_AI_PROCESSING');
    });

    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });

    // Open the AI Course Creator modal
    const launchBtn = page.locator('[data-testid="launch-ai-builder-btn"]');
    await launchBtn.waitFor({ timeout: 10_000 });
    await launchBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('RequirementLink component is visible in the modal', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const reqLink = dialog.locator('[data-testid="requirement-link"]');
    await expect(reqLink).toBeVisible({ timeout: 10_000 });
  });

  test('consent warning contains a clickable link (not just plain text)', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const reqLink = dialog.locator('[data-testid="requirement-link"]');
    // The RequirementLink must contain an <a> element — if it's just text, the bug has regressed
    const link = reqLink.locator('a');
    await expect(link).toBeVisible({ timeout: 10_000 });
    // Link must have a valid href pointing to settings
    const href = await link.getAttribute('href');
    expect(href).toContain('/settings');
    expect(href).toContain('highlight=ai-consent');
  });

  test('link text is present and readable', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const reqLink = dialog.locator('[data-testid="requirement-link"]');
    const link = reqLink.locator('a');
    const linkText = await link.textContent();
    // Must have non-empty text (the i18n key resolves to clickable text)
    expect(linkText?.trim().length).toBeGreaterThan(0);
  });

  test('clicking the consent link navigates to /settings?highlight=ai-consent', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const reqLink = dialog.locator('[data-testid="requirement-link"]');
    const link = reqLink.locator('a');
    await link.click();

    // Wait for navigation to settings page
    await page.waitForURL(/\/settings\?highlight=ai-consent/, { timeout: 10_000 });
    expect(page.url()).toContain('/settings?highlight=ai-consent');
  });

  test('RequirementLink has role="alert" (alert variant)', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const reqLink = dialog.locator('[data-testid="requirement-link"]');
    await expect(reqLink).toHaveAttribute('role', 'alert');
  });

  test('no raw technical error strings visible in the consent warning area', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const bodyText = await dialog.textContent() ?? '';
    expect(bodyText).not.toContain('urql error');
    expect(bodyText).not.toContain('GraphQL error');
    expect(bodyText).not.toContain('Cannot read properties');
    expect(bodyText).not.toContain('[object Object]');
  });

  test('visual screenshot: consent link visible in AI modal', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const reqLink = dialog.locator('[data-testid="requirement-link"]');
    await expect(reqLink).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveScreenshot('consent-link-in-ai-modal.png', {
      maxDiffPixelRatio: 0.03,
      timeout: 15_000,
    });
  });
});

// ─── Suite 2: Consent granted — link should NOT appear ──────────────────────

test.describe('Consent Link — Hidden when consent is already granted', () => {
  test('RequirementLink is NOT visible when AI consent is already granted', async ({ page }) => {
    await routeGraphQL(page, () => null);
    await login(page);

    // Grant consent in localStorage BEFORE navigating
    await page.evaluate(() => {
      localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    });

    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });

    const launchBtn = page.locator('[data-testid="launch-ai-builder-btn"]');
    await launchBtn.waitFor({ timeout: 10_000 });
    await launchBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

    const dialog = page.getByRole('dialog');
    // RequirementLink should NOT be visible when consent is already granted
    await expect(dialog.locator('[data-testid="requirement-link"]')).not.toBeVisible({ timeout: 5_000 });
  });
});

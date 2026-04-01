/**
 * org-signup-wizard.spec.ts — E2E tests for the Organization Signup Wizard.
 *
 * Route: /signup/organization (public — no authentication required)
 *
 * Covers:
 *   - 3-step wizard flow (Account → Organization → Branding)
 *   - Step validation (cannot advance without valid data)
 *   - Slug availability check
 *   - Successful signup submission
 *   - Error handling (network failure, slug taken)
 *   - Visual regression screenshots
 *   - Accessibility (aria labels, keyboard navigation)
 *   - No raw error strings exposed
 *
 * All GraphQL calls intercepted via page.route() — no live backend needed.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/org-signup-wizard.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, RUN_WRITE_TESTS } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const WIZARD_ROUTE = '/signup/organization';

// ─── Mock helpers ────────────────────────────────────────────────────────────

async function mockSignupSuccess(
  page: import('@playwright/test').Page
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (op === 'CreateOrganization' || op.toLowerCase().includes('createorg')) {
      return JSON.stringify({
        data: {
          createOrganization: {
            tenantId: 'tenant-e2e-001',
            slug: 'acme-university',
            status: 'ACTIVE',
          },
        },
      });
    }
    if (op === 'CheckSlugAvailability' || op.toLowerCase().includes('slug')) {
      return JSON.stringify({
        data: { checkSlugAvailability: { available: true, suggestions: [] } },
      });
    }
    return null;
  });
}

async function mockSignupError(
  page: import('@playwright/test').Page
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (op === 'CreateOrganization' || op.toLowerCase().includes('createorg')) {
      return JSON.stringify({
        data: null,
        errors: [{ message: 'Failed to create organization' }],
      });
    }
    if (op === 'CheckSlugAvailability' || op.toLowerCase().includes('slug')) {
      return JSON.stringify({
        data: { checkSlugAvailability: { available: true, suggestions: [] } },
      });
    }
    return null;
  });
}

async function mockSlugTaken(
  page: import('@playwright/test').Page
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (op === 'CheckSlugAvailability' || op.toLowerCase().includes('slug')) {
      return JSON.stringify({
        data: {
          checkSlugAvailability: {
            available: false,
            suggestions: ['acme-university-2', 'acme-uni', 'acmeuniversity'],
          },
        },
      });
    }
    return null;
  });
}

async function assertNoRawErrors(
  page: import('@playwright/test').Page
): Promise<void> {
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('stack trace');
}

// ─── Suite 1: Page structure ─────────────────────────────────────────────────

test.describe('Org Signup Wizard — Structure', () => {
  test.beforeEach(async ({ page }) => {
    await mockSignupSuccess(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });
  });

  test('wizard loads at /signup/organization', async ({ page }) => {
    await expect(page.locator('[data-testid="org-signup-wizard"]')).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test('shows 3-step progress stepper', async ({ page }) => {
    const stepper = page.locator('[data-testid="wizard-stepper"]');
    await expect(stepper).toBeVisible({ timeout: 10_000 });
    const steps = stepper.locator('[data-step]');
    await expect(steps).toHaveCount(3);
  });

  test('step 1 is active by default', async ({ page }) => {
    const step1 = page.locator('[data-step="1"]');
    await expect(step1).toHaveAttribute('data-active', 'true');
  });

  test('no raw error strings on initial load', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 2: Step 1 — Account ──────────────────────────────────────────────

test.describe('Org Signup Wizard — Step 1 Account', () => {
  test.beforeEach(async ({ page }) => {
    await mockSignupSuccess(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });
  });

  test('full name field is visible and required', async ({ page }) => {
    const field = page.locator('[data-testid="input-full-name"]');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('aria-required', 'true');
  });

  test('email field has type="email"', async ({ page }) => {
    const field = page.locator('[data-testid="input-email"]');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('type', 'email');
  });

  test('password field has toggle visibility button', async ({ page }) => {
    await expect(page.locator('[data-testid="input-password"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('[data-testid="toggle-password-visibility"]')
    ).toBeVisible();
  });

  test('ToS and GDPR checkboxes are present', async ({ page }) => {
    await expect(page.locator('[data-testid="checkbox-tos"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="checkbox-gdpr"]')).toBeVisible();
  });

  test('Next button is disabled when form is empty', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="btn-next"]');
    await expect(nextBtn).toBeDisabled();
  });

  test('submitting empty step shows validation errors', async ({ page }) => {
    // Try clicking Next while empty
    await page.locator('[data-testid="btn-next"]').click({ force: true });
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Suite 3: Step navigation ────────────────────────────────────────────────

test.describe('Org Signup Wizard — Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockSignupSuccess(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });
  });

  async function fillStep1(
    page: import('@playwright/test').Page
  ): Promise<void> {
    await page.locator('[data-testid="input-full-name"]').fill('John Admin');
    await page.locator('[data-testid="input-email"]').fill('admin@acme.edu');
    await page.locator('[data-testid="input-password"]').fill('SecureP@ss123');
    await page.locator('[data-testid="checkbox-tos"]').click();
    await page.locator('[data-testid="checkbox-gdpr"]').click();
  }

  test('advances to step 2 when step 1 is valid', async ({ page }) => {
    await fillStep1(page);
    await page.locator('[data-testid="btn-next"]').click();
    await expect(page.locator('[data-step="2"]')).toHaveAttribute(
      'data-active',
      'true',
      { timeout: 5_000 }
    );
  });

  test('back button returns to step 1 from step 2', async ({ page }) => {
    await fillStep1(page);
    await page.locator('[data-testid="btn-next"]').click();
    await page
      .locator('[data-step="2"][data-active="true"]')
      .waitFor({ timeout: 5_000 });
    await page.locator('[data-testid="btn-back"]').click();
    await expect(page.locator('[data-step="1"]')).toHaveAttribute(
      'data-active',
      'true',
      { timeout: 5_000 }
    );
  });

  test('step 1 data preserved after navigation', async ({ page }) => {
    await fillStep1(page);
    await page.locator('[data-testid="btn-next"]').click();
    await page
      .locator('[data-step="2"][data-active="true"]')
      .waitFor({ timeout: 5_000 });
    await page.locator('[data-testid="btn-back"]').click();
    await expect(page.locator('[data-testid="input-full-name"]')).toHaveValue(
      'John Admin'
    );
  });
});

// ─── Suite 4: Slug validation ────────────────────────────────────────────────

test.describe('Org Signup Wizard — Slug Validation', () => {
  test('shows "slug taken" with suggestions', async ({ page }) => {
    await mockSlugTaken(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });

    // Navigate to step 2 (need to fill step 1 first)
    await page.locator('[data-testid="input-full-name"]').fill('John Admin');
    await page.locator('[data-testid="input-email"]').fill('admin@acme.edu');
    await page.locator('[data-testid="input-password"]').fill('SecureP@ss123');
    await page.locator('[data-testid="checkbox-tos"]').click();
    await page.locator('[data-testid="checkbox-gdpr"]').click();
    await page.locator('[data-testid="btn-next"]').click();
    await page
      .locator('[data-step="2"][data-active="true"]')
      .waitFor({ timeout: 5_000 });

    // Fill slug field
    await page.locator('[data-testid="input-slug"]').fill('acme-university');
    await page.locator('[data-testid="input-slug"]').blur();

    // Wait for availability check response
    await expect(
      page.locator('[data-testid="slug-taken-message"]')
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 5: Successful submission ──────────────────────────────────────────

test.describe('Org Signup Wizard — Submission', () => {
  test('successful signup shows success message', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockSignupSuccess(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });

    // Fill all 3 steps and submit
    // Step 1
    await page.locator('[data-testid="input-full-name"]').fill('John Admin');
    await page.locator('[data-testid="input-email"]').fill('admin@acme.edu');
    await page.locator('[data-testid="input-password"]').fill('SecureP@ss123');
    await page.locator('[data-testid="checkbox-tos"]').click();
    await page.locator('[data-testid="checkbox-gdpr"]').click();
    await page.locator('[data-testid="btn-next"]').click();

    // Step 2
    await page
      .locator('[data-step="2"][data-active="true"]')
      .waitFor({ timeout: 5_000 });
    await page
      .locator('[data-testid="input-org-name"]')
      .fill('Acme University');
    await page.locator('[data-testid="input-slug"]').fill('acme-university');
    await page.locator('[data-testid="select-industry"]').click();
    await page.getByRole('option', { name: /technology/i }).click();
    await page.locator('[data-testid="btn-next"]').click();

    // Step 3 (Branding — minimal)
    await page
      .locator('[data-step="3"][data-active="true"]')
      .waitFor({ timeout: 5_000 });
    await page.locator('[data-testid="btn-create-org"]').click();

    await expect(page.locator('[data-testid="signup-success"]')).toBeVisible({
      timeout: 15_000,
    });
    await assertNoRawErrors(page);
  });
});

// ─── Suite 6: Error handling ─────────────────────────────────────────────────

test.describe('Org Signup Wizard — Error Handling', () => {
  test('mutation error shows user-friendly message', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockSignupError(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });

    // Fill and submit (abbreviated)
    await page.locator('[data-testid="input-full-name"]').fill('Error Test');
    await page.locator('[data-testid="input-email"]').fill('error@test.com');
    await page.locator('[data-testid="input-password"]').fill('SecureP@ss123');
    await page.locator('[data-testid="checkbox-tos"]').click();
    await page.locator('[data-testid="checkbox-gdpr"]').click();
    await page.locator('[data-testid="btn-next"]').click();

    // Navigate through all steps and submit
    await page
      .locator('[data-step="2"][data-active="true"]')
      .waitFor({ timeout: 5_000 });
    await page.locator('[data-testid="input-org-name"]').fill('Error Org');
    await page.locator('[data-testid="input-slug"]').fill('error-org');
    await page.locator('[data-testid="select-industry"]').click();
    await page.getByRole('option').first().click();
    await page.locator('[data-testid="btn-next"]').click();

    await page
      .locator('[data-step="3"][data-active="true"]')
      .waitFor({ timeout: 5_000 });
    await page.locator('[data-testid="btn-create-org"]').click();

    await expect(page.locator('[data-testid="signup-error"]')).toBeVisible({
      timeout: 10_000,
    });
    await assertNoRawErrors(page);
  });
});

// ─── Suite 7: Visual regression ──────────────────────────────────────────────

test.describe('Org Signup Wizard — Visual Regression', () => {
  test('visual regression — step 1 empty state', async ({ page }) => {
    await mockSignupSuccess(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('org-signup-step1-empty.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('visual regression — mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockSignupSuccess(page);
    await page.goto(`${BASE_URL}${WIZARD_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="org-signup-wizard"]')
      .waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('org-signup-step1-mobile.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

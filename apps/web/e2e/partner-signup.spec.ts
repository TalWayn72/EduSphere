/**
 * partner-signup.spec.ts — Partner Program Signup E2E Tests
 *
 * Route: /partners (public — no authentication required)
 *
 * The page allows organisations to apply to become EduSphere partners.
 * It displays four partner type cards, a revenue-share info card, and a
 * React Hook Form + Zod signup form that fires a `requestPartner` GraphQL
 * mutation on submit.
 *
 * All GraphQL traffic is intercepted via page.route() — no live backend needed.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/partner-signup.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Anti-regression helpers ──────────────────────────────────────────────────

/** Assert no raw technical error strings are visible to the user. */
async function assertNoRawErrors(page: Page): Promise<void> {
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('Error:');
}

// ─── GraphQL mock helpers ─────────────────────────────────────────────────────

/**
 * Intercept all GraphQL requests for the /partners page and return a
 * successful `requestPartner` mutation response.
 */
async function mockPartnerMutationSuccess(page: Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as {
      query?: string;
      operationName?: string;
    };
    const q = body?.query ?? '';
    const op = body?.operationName ?? '';

    if (q.includes('requestPartner') || op === 'RequestPartner') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            requestPartner: {
              status: 'PENDING',
              message: 'Application received',
              requestId: 'req-e2e-001',
            },
          },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

/**
 * Intercept all GraphQL requests and return a network error so that the
 * error-state path in the form is exercised.
 */
async function mockPartnerMutationError(page: Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as {
      query?: string;
      operationName?: string;
    };
    const q = body?.query ?? '';
    const op = body?.operationName ?? '';

    if (q.includes('requestPartner') || op === 'RequestPartner') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Internal server error', extensions: { code: 'INTERNAL_ERROR' } }],
          data: null,
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

// ─── Helper: fill the partner form with valid data ────────────────────────────

async function fillValidPartnerForm(page: Page): Promise<void> {
  await page.fill('#organizationName', 'Acme Training Ltd');
  await page.fill('#contactName', 'Jane Smith');
  await page.fill('#contactEmail', 'jane@acme.com');
  await page.fill('#expectedLearners', '500');
  await page.fill('#description', 'We plan to deliver corporate AI training using EduSphere white-label to our 500 enterprise clients across EMEA.');

  // Open the Select and pick TRAINING_COMPANY
  await page.click('[id="partnerType"]');
  await page.getByRole('option', { name: 'Training Company' }).click();
}

// ─── Suite 1: Page renders correctly ─────────────────────────────────────────

test.describe('Partner Signup — Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('/partners page loads with main container', async ({ page }) => {
    await expect(
      page.locator('[data-testid="partner-signup-page"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('page heading says "Become an EduSphere Partner"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Become an EduSphere Partner/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw error strings on initial load', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  test('EduSphere brand logo link is present in the nav', async ({ page }) => {
    await expect(page.getByRole('link', { name: /EduSphere/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── Suite 2: Revenue Share Information ──────────────────────────────────────

test.describe('Partner Signup — Revenue Share Info', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('"30% Revenue Share" info card is visible', async ({ page }) => {
    await expect(page.getByText(/30% Revenue Share/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('"70% goes to you" partner split text is visible', async ({ page }) => {
    await expect(page.getByText(/70% goes to you/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── Suite 3: Partner Type Cards ─────────────────────────────────────────────

test.describe('Partner Signup — Partner Type Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('TRAINING COMPANY card is visible', async ({ page }) => {
    await expect(page.getByText(/Training Company/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('CONTENT CREATOR card is visible', async ({ page }) => {
    await expect(page.getByText(/Content Creator/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('RESELLER card is visible', async ({ page }) => {
    await expect(page.getByText(/Reseller/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('SYSTEM INTEGRATOR card is visible', async ({ page }) => {
    await expect(page.getByText(/System Integrator/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('all four partner type cards are rendered (≥4 type entries)', async ({ page }) => {
    // Each partner type card contains the type name in a bold <p>
    const typeNames = [
      'TRAINING COMPANY',
      'CONTENT CREATOR',
      'RESELLER',
      'SYSTEM INTEGRATOR',
    ];
    for (const name of typeNames) {
      await expect(page.getByText(name, { exact: false })).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('Reseller card mentions 20% commission', async ({ page }) => {
    await expect(page.getByText(/20% commission/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── Suite 4: Signup Form Fields ─────────────────────────────────────────────

test.describe('Partner Signup — Form Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('Organization Name field is present', async ({ page }) => {
    await expect(page.locator('#organizationName')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Contact Name field is present', async ({ page }) => {
    await expect(page.locator('#contactName')).toBeVisible({ timeout: 10_000 });
  });

  test('Contact Email field is present', async ({ page }) => {
    await expect(page.locator('#contactEmail')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Partner Type select is present', async ({ page }) => {
    await expect(page.locator('#partnerType')).toBeVisible({ timeout: 10_000 });
  });

  test('Expected Learners field is present', async ({ page }) => {
    await expect(page.locator('#expectedLearners')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Description textarea is present', async ({ page }) => {
    await expect(page.locator('#description')).toBeVisible({ timeout: 10_000 });
  });

  test('submit button is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="partner-submit-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('visual screenshot — partner signup form (idle)', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('partner-signup-form-idle.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

// ─── Suite 5: Form Validation ─────────────────────────────────────────────────

test.describe('Partner Signup — Validation Errors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('submit button is disabled on empty form', async ({ page }) => {
    const btn = page.locator('[data-testid="partner-submit-btn"]');
    await btn.waitFor({ timeout: 10_000 });
    // Button is disabled because isValid=false (Zod validation in onChange mode)
    await expect(btn).toBeDisabled();
  });

  test('entering invalid email shows email validation error', async ({ page }) => {
    await page.fill('#contactEmail', 'not-an-email');
    await page.fill('#organizationName', 'x'); // trigger blur on email
    // Allow Zod/RHF to run onChange validations
    await page.locator('#organizationName').blur();
    // Look for a role=alert near the contactEmail field
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 8_000 });
  });

  test('short organization name (1 char) triggers validation message', async ({ page }) => {
    await page.fill('#organizationName', 'A');
    await page.locator('#organizationName').blur();
    const alert = page.locator('[role="alert"]').first();
    await expect(alert).toBeVisible({ timeout: 8_000 });
  });

  test('short description (< 20 chars) keeps submit disabled', async ({ page }) => {
    await page.fill('#organizationName', 'Acme Corp');
    await page.fill('#contactName', 'Jane Smith');
    await page.fill('#contactEmail', 'jane@acme.com');
    await page.fill('#expectedLearners', '100');
    await page.fill('#description', 'Too short.');
    const btn = page.locator('[data-testid="partner-submit-btn"]');
    await expect(btn).toBeDisabled();
  });
});

// ─── Suite 6: Successful Submission ──────────────────────────────────────────

test.describe('Partner Signup — Success State', () => {
  test.beforeEach(async ({ page }) => {
    await mockPartnerMutationSuccess(page);
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('filling and submitting a valid form shows success state', async ({ page }) => {
    await fillValidPartnerForm(page);

    const btn = page.locator('[data-testid="partner-submit-btn"]');
    await expect(btn).toBeEnabled({ timeout: 8_000 });
    await btn.click();

    await expect(
      page.locator('[data-testid="partner-success-message"]')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('success state says "Application Received!"', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();

    await expect(
      page.getByRole('heading', { name: /Application Received/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('success state confirms review within 3 business days', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();

    await expect(
      page.locator('[data-testid="partner-success-message"]')
    ).toBeVisible({ timeout: 15_000 });

    const body = (await page.textContent('body')) ?? '';
    expect(body).toMatch(/3 business days/i);
  });

  test('success state has role="status" aria-live region', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();

    const successEl = page.locator('[data-testid="partner-success-message"]');
    await expect(successEl).toBeVisible({ timeout: 15_000 });

    await expect(successEl).toHaveAttribute('role', 'status');
    await expect(successEl).toHaveAttribute('aria-live', 'polite');
  });

  test('signup form is no longer visible after success', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();

    await expect(
      page.locator('[data-testid="partner-success-message"]')
    ).toBeVisible({ timeout: 15_000 });

    // The form should be replaced by the success panel
    await expect(page.locator('form')).not.toBeVisible();
  });

  test('no raw error strings in success state', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();
    await page
      .locator('[data-testid="partner-success-message"]')
      .waitFor({ timeout: 15_000 });
    await assertNoRawErrors(page);
  });

  test('visual screenshot — partner signup success state', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();
    await page
      .locator('[data-testid="partner-success-message"]')
      .waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('partner-signup-success.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

// ─── Suite 7: Error State ─────────────────────────────────────────────────────

test.describe('Partner Signup — GraphQL Error State', () => {
  test.beforeEach(async ({ page }) => {
    await mockPartnerMutationError(page);
    await page.goto(`${BASE_URL}/partners`, { waitUntil: 'domcontentloaded' });
  });

  test('GraphQL mutation error shows friendly error message (not raw stack)', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();

    const errorMsg = page.locator('[data-testid="partner-error-message"]');
    await expect(errorMsg).toBeVisible({ timeout: 15_000 });

    // Must show user-friendly message — never raw GraphQL error text
    const text = (await errorMsg.textContent()) ?? '';
    expect(text).toMatch(/something went wrong|please try again/i);
    expect(text).not.toContain('Internal server error');
    expect(text).not.toContain('INTERNAL_ERROR');
  });

  test('success state is NOT shown when mutation fails', async ({ page }) => {
    await fillValidPartnerForm(page);
    await page.locator('[data-testid="partner-submit-btn"]').click();

    await page
      .locator('[data-testid="partner-error-message"]')
      .waitFor({ timeout: 15_000 });

    await expect(
      page.locator('[data-testid="partner-success-message"]')
    ).not.toBeVisible();
  });
});

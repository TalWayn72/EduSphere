/**
 * pilot-signup.spec.ts — Pilot Signup Page E2E Tests
 *
 * Route: /pilot  (public — no authentication required)
 *
 * Covers the PilotSignupPage component:
 *   - Page structure and required form fields
 *   - Client-side validation errors on empty submit
 *   - Successful submission (mocked requestPilot mutation)
 *   - Error state from failed mutation
 *   - No raw error strings visible to user
 *   - Visual regression screenshots
 *
 * All GraphQL calls are intercepted via page.route() — no live backend needed.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/pilot-signup.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, RUN_WRITE_TESTS } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const PILOT_ROUTE = '/pilot';

// ─── GraphQL mock helpers ──────────────────────────────────────────────────────

/**
 * Intercept all GraphQL POST requests.
 * requestPilot mutation returns a success payload.
 */
async function mockRequestPilotSuccess(
  page: import('@playwright/test').Page,
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (op === 'RequestPilot' || op.toLowerCase().includes('requestpilot')) {
      return JSON.stringify({
        data: {
          requestPilot: {
            status: 'PENDING',
            message: 'Pilot request submitted successfully.',
            requestId: 'req-e2e-001',
          },
        },
      });
    }
    return null;
  });
}

/**
 * Intercept GraphQL and return a network error for requestPilot.
 */
async function mockRequestPilotError(
  page: import('@playwright/test').Page,
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (op === 'RequestPilot' || op.toLowerCase().includes('requestpilot')) {
      return JSON.stringify({
        data: null,
        errors: [{ message: 'Service temporarily unavailable' }],
      });
    }
    return null;
  });
}

// ─── Anti-regression helpers ──────────────────────────────────────────────────

/** Assert no raw technical error strings are visible to the user. */
async function assertNoRawErrors(
  page: import('@playwright/test').Page,
): Promise<void> {
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('Error:');
  expect(body).not.toContain('stack trace');
}

// ─── Suite 1: Page structure ──────────────────────────────────────────────────

test.describe('Pilot Signup Page — Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}${PILOT_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    // Wait for the app to finish auth initialization (Keycloak + i18n) and
    // render the actual page. On slower browser profiles (e.g. mobile-chrome),
    // this completes after domcontentloaded, so waiting for the page container
    // ensures the content is ready before any test assertion.
    await page
      .locator('[data-testid="pilot-signup-page"]')
      .waitFor({ timeout: 15_000 });
  });

  test('pilot signup page loads at /pilot', async ({ page }) => {
    await expect(
      page.locator('[data-testid="pilot-signup-page"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('page heading "Start Your Free Pilot" is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Start Your Free Pilot/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('EduSphere brand logo link is present in nav', async ({ page }) => {
    await expect(page.getByRole('link', { name: /EduSphere/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('subheading mentions 90 days and no credit card', async ({ page }) => {
    const body = (await page.textContent('body')) ?? '';
    expect(body).toMatch(/90 days/i);
    expect(body).toMatch(/no credit card/i);
  });

  test('no raw error strings on initial load', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 2: Form fields ─────────────────────────────────────────────────────

test.describe('Pilot Signup Page — Form Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}${PILOT_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('[data-testid="pilot-form"]').waitFor({ timeout: 15_000 });
  });

  test('Organization Name field is present and required', async ({ page }) => {
    const field = page.locator('#orgName');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('aria-required', 'true');
  });

  test('Organization Type select is present and required', async ({ page }) => {
    const trigger = page.locator('#orgType');
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await expect(trigger).toHaveAttribute('aria-required', 'true');
  });

  test('Contact Name field is present and required', async ({ page }) => {
    const field = page.locator('#contactName');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('aria-required', 'true');
  });

  test('Email field is present with type="email"', async ({ page }) => {
    const field = page.locator('#contactEmail');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('type', 'email');
    await expect(field).toHaveAttribute('aria-required', 'true');
  });

  test('Estimated Users field is present with type="number"', async ({
    page,
  }) => {
    const field = page.locator('#estimatedUsers');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('type', 'number');
  });

  test('Use Case textarea is present and required', async ({ page }) => {
    const field = page.locator('#useCase');
    await expect(field).toBeVisible({ timeout: 10_000 });
    await expect(field).toHaveAttribute('aria-required', 'true');
  });

  test('Submit button is present and enabled initially', async ({ page }) => {
    const btn = page.locator('[data-testid="pilot-submit-btn"]');
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).not.toBeDisabled();
  });

  test('all 5 organization type options are available', async ({ page }) => {
    const trigger = page.locator('#orgType');
    await trigger.click();
    const content = page.locator('[role="listbox"]');
    await expect(content).toBeVisible({ timeout: 5_000 });
    for (const option of [
      'University',
      'College',
      'Corporate',
      'Government',
      'Defense',
    ]) {
      await expect(page.getByRole('option', { name: option })).toBeVisible({
        timeout: 5_000,
      });
    }
  });
});

// ─── Suite 3: Validation errors ───────────────────────────────────────────────

test.describe('Pilot Signup Page — Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}${PILOT_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('[data-testid="pilot-form"]').waitFor({ timeout: 15_000 });
  });

  test('submitting empty form shows validation errors', async ({ page }) => {
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    // At least one [role="alert"] should appear
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5_000 });
    const count = await alerts.count();
    expect(count).toBeGreaterThan(0);
  });

  test('orgName validation error appears when field is too short', async ({
    page,
  }) => {
    await page.locator('#orgName').fill('X');
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await expect(
      page.locator('[role="alert"]').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.locator('#contactEmail').fill('not-an-email');
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5_000 });
  });

  test('use case under 10 chars shows validation error', async ({ page }) => {
    await page.locator('#useCase').fill('Short');
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5_000 });
  });

  test('validation errors do not expose raw stack traces', async ({ page }) => {
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page.locator('[role="alert"]').first().waitFor({ timeout: 5_000 });
    await assertNoRawErrors(page);
  });
});

// ─── Suite 4: Successful submission ───────────────────────────────────────────

test.describe('Pilot Signup Page — Successful Submission', () => {
  test.beforeEach(async ({ page }) => {
    await mockRequestPilotSuccess(page);
    await page.goto(`${BASE_URL}${PILOT_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('[data-testid="pilot-form"]').waitFor({ timeout: 15_000 });
  });

  /** Fill all required fields with valid data. */
  async function fillValidForm(
    page: import('@playwright/test').Page,
  ): Promise<void> {
    await page.locator('#orgName').fill('Test University of E2E');
    // Select organization type
    await page.locator('#orgType').click();
    const uniOption = page.getByRole('option', { name: 'University' });
    await uniOption.waitFor({ timeout: 5_000 });
    await uniOption.click();
    // Contact details
    await page.locator('#contactName').fill('Dr. E2E Tester');
    await page.locator('#contactEmail').fill('e2e.tester@university.edu');
    await page.locator('#estimatedUsers').fill('250');
    await page.locator('#useCase').fill(
      'We want to use EduSphere for undergraduate computer science courses.',
    );
  }

  test('filling valid form and submitting shows success message', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await expect(
      page.locator('[data-testid="pilot-success-message"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('success message contains "Request Received" heading', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-success-message"]')
      .waitFor({ timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /Request Received/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('success message has role="status" and aria-live="polite"', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    const successEl = page.locator('[data-testid="pilot-success-message"]');
    await successEl.waitFor({ timeout: 10_000 });
    await expect(successEl).toHaveAttribute('role', 'status');
    await expect(successEl).toHaveAttribute('aria-live', 'polite');
  });

  test('form is hidden after successful submission', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-success-message"]')
      .waitFor({ timeout: 10_000 });
    await expect(page.locator('[data-testid="pilot-form"]')).not.toBeVisible();
  });

  test('no raw error strings visible after successful submission', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-success-message"]')
      .waitFor({ timeout: 10_000 });
    await assertNoRawErrors(page);
  });

  test('visual regression — success state screenshot', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-success-message"]')
      .waitFor({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('pilot-signup-success.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── Suite 5: Mutation error handling ────────────────────────────────────────

test.describe('Pilot Signup Page — Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockRequestPilotError(page);
    await page.goto(`${BASE_URL}${PILOT_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('[data-testid="pilot-form"]').waitFor({ timeout: 15_000 });
  });

  /** Fill minimum valid data so the form passes client validation. */
  async function fillMinimalValidForm(
    page: import('@playwright/test').Page,
  ): Promise<void> {
    await page.locator('#orgName').fill('Test University Error Case');
    await page.locator('#orgType').click();
    const uniOption = page.getByRole('option', { name: 'University' });
    await uniOption.waitFor({ timeout: 5_000 });
    await uniOption.click();
    await page.locator('#contactName').fill('Error Tester');
    await page.locator('#contactEmail').fill('error@university.edu');
    await page.locator('#estimatedUsers').fill('100');
    await page.locator('#useCase').fill(
      'Testing the error handling path for this form.',
    );
  }

  test('mutation error shows error message element', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillMinimalValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await expect(
      page.locator('[data-testid="pilot-error-message"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('error message does not contain raw GraphQL stack traces', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillMinimalValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-error-message"]')
      .waitFor({ timeout: 10_000 });
    const errText =
      (await page
        .locator('[data-testid="pilot-error-message"]')
        .textContent()) ?? '';
    expect(errText).not.toContain('Cannot read properties');
    expect(errText).not.toContain('[object Object]');
    expect(errText).not.toContain('at Object.');
  });

  test('form remains visible after mutation error (user can retry)', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillMinimalValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-error-message"]')
      .waitFor({ timeout: 10_000 });
    await expect(page.locator('[data-testid="pilot-form"]')).toBeVisible();
  });

  test('success message is NOT shown when mutation errors', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await fillMinimalValidForm(page);
    await page.locator('[data-testid="pilot-submit-btn"]').click();
    await page
      .locator('[data-testid="pilot-error-message"]')
      .waitFor({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="pilot-success-message"]'),
    ).not.toBeVisible();
  });
});

// ─── Suite 6: Visual regression ───────────────────────────────────────────────

test.describe('Pilot Signup Page — Visual Regression', () => {
  test('visual regression — empty form initial state', async ({ page }) => {
    await page.goto(`${BASE_URL}${PILOT_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('[data-testid="pilot-form"]').waitFor({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('pilot-signup-empty-form.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

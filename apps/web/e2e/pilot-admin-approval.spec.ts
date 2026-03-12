/**
 * pilot-admin-approval.spec.ts — Pilot Requests Admin Page E2E Tests
 *
 * Route: /admin/pilot-requests  (SUPER_ADMIN only)
 *
 * Covers the PilotRequestsAdminPage component:
 *   - Page loads and shows the requests table (mocked allPilotRequests query)
 *   - Approve button opens modal with seat limit input
 *   - Confirming approval triggers approvePilotRequest mutation
 *   - Reject button opens modal with reason textarea
 *   - Confirming rejection triggers rejectPilotRequest mutation
 *   - Empty table state shows appropriate message
 *   - No raw error strings visible to user
 *   - Visual regression screenshots
 *
 * All GraphQL calls are intercepted via page.route() — no live backend needed.
 * Auth is bootstrapped via DEV_MODE (loginInDevMode helper) so no Keycloak is needed.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/pilot-admin-approval.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL, RUN_WRITE_TESTS } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

/**
 * clickByTestId — programmatic click that bypasses Playwright's pointer/touch
 * event simulation. On mobile-chrome (hasTouch: true), the standard .click()
 * can be eaten by the browser's scroll-intent heuristic when the target is
 * inside an overflow-x:auto table. Calling element.click() directly in the
 * browser context always fires the React onClick handler.
 */
async function clickByTestId(page: Page, testId: string): Promise<void> {
  await page.locator(`[data-testid="${testId}"]`).scrollIntoViewIfNeeded();
  await page.evaluate((id: string) => {
    const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    el?.click();
  }, testId);
}

/**
 * clickDialogButton — programmatic click for buttons INSIDE a Radix UI Dialog.
 *
 * On mobile-chrome (hasTouch: true), Radix UI's dialog backdrop overlay
 * (`<div class="fixed inset-0 z-50 bg-black/80">`) intercepts Playwright's
 * synthetic pointer/touch events, preventing .click() from reaching buttons
 * inside the dialog. Calling element.click() directly in the browser context
 * bypasses event simulation entirely and fires the React onClick handler.
 *
 * @param page       - Playwright Page object
 * @param buttonText - Partial text content to match against dialog buttons
 */
async function clickDialogButton(page: Page, buttonText: string): Promise<void> {
  await page.evaluate((text: string) => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const btn = buttons.find((b) => (b.textContent ?? '').trim().includes(text));
    (btn as HTMLElement | undefined)?.click();
  }, buttonText);
}

const ADMIN_ROUTE = '/admin/pilot-requests';

// ─── Mock data ────────────────────────────────────────────────────────────────

interface MockPilotRequest {
  __typename: 'PilotRequest';
  id: string;
  orgName: string;
  orgType: string;
  contactEmail: string;
  estimatedUsers: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

function makePilotRequest(
  overrides: Partial<MockPilotRequest> = {},
): MockPilotRequest {
  return {
    __typename: 'PilotRequest',
    id: 'req-e2e-001',
    orgName: 'State University of Testing',
    orgType: 'UNIVERSITY',
    contactEmail: 'admin@stateuniversity.edu',
    estimatedUsers: 1500,
    status: 'PENDING',
    createdAt: new Date('2026-02-15T10:00:00Z').toISOString(),
    ...overrides,
  };
}

// ─── GraphQL mock helpers ─────────────────────────────────────────────────────

interface MockConfig {
  requests?: MockPilotRequest[];
  approveSuccess?: boolean;
  rejectSuccess?: boolean;
}

/**
 * Intercept all GraphQL requests and respond with mocked data.
 *  - allPilotRequests → returns `requests` array
 *  - approvePilotRequest → returns success payload or error
 *  - rejectPilotRequest → returns true or error
 */
async function mockAdminGraphQL(
  page: import('@playwright/test').Page,
  config: MockConfig = {},
): Promise<void> {
  const requests = config.requests ?? [makePilotRequest()];
  const approveSuccess = config.approveSuccess !== false;
  const rejectSuccess = config.rejectSuccess !== false;

  await routeGraphQL(page, (op, body) => {
    const queryStr = (body.query as string | undefined) ?? '';

    // allPilotRequests query — match on operation name OR query body
    if (
      op === 'AllPilotRequests' ||
      op.toLowerCase().includes('allpilotrequests') ||
      op.toLowerCase().includes('pilotrequests') ||
      queryStr.includes('allPilotRequests')
    ) {
      return JSON.stringify({ data: { allPilotRequests: requests } });
    }

    // approvePilotRequest mutation
    if (
      op === 'ApprovePilot' ||
      op.toLowerCase().includes('approvepilot') ||
      op.toLowerCase().includes('approvepilotrequest') ||
      queryStr.includes('approvePilotRequest')
    ) {
      if (approveSuccess) {
        return JSON.stringify({
          data: {
            approvePilotRequest: {
              id: requests[0]?.id ?? 'req-e2e-001',
              plan: 'PILOT',
              seatLimit: 100,
            },
          },
        });
      }
      return JSON.stringify({
        data: null,
        errors: [{ message: 'Failed to approve pilot request' }],
      });
    }

    // rejectPilotRequest mutation
    if (
      op === 'RejectPilot' ||
      op.toLowerCase().includes('rejectpilot') ||
      op.toLowerCase().includes('rejectpilotrequest') ||
      queryStr.includes('rejectPilotRequest')
    ) {
      if (rejectSuccess) {
        return JSON.stringify({ data: { rejectPilotRequest: true } });
      }
      return JSON.stringify({
        data: null,
        errors: [{ message: 'Failed to reject pilot request' }],
      });
    }

    return null; // empty-data fallback for unknown ops
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

test.describe('Pilot Requests Admin Page — Structure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockAdminGraphQL(page);
    await page.goto(`${BASE_URL}${ADMIN_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="pilot-requests-page"]')
      .waitFor({ timeout: 15_000 });
  });

  test('pilot requests admin page loads at /admin/pilot-requests', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="pilot-requests-page"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('page title "Pilot Requests" is visible in the admin layout', async ({
    page,
  }) => {
    await expect(page.getByText(/Pilot Requests/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('no raw error strings on initial load', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  test('visual regression — page with pending requests', async ({ page }) => {
    await page
      .locator('[data-testid="pilot-requests-table"]')
      .waitFor({ timeout: 20_000 });
    await expect(page).toHaveScreenshot('pilot-admin-requests-list.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── Suite 2: Requests table ──────────────────────────────────────────────────

test.describe('Pilot Requests Admin Page — Requests Table', () => {
  const pendingRequest = makePilotRequest({
    id: 'req-e2e-001',
    orgName: 'State University of Testing',
    status: 'PENDING',
  });
  const approvedRequest = makePilotRequest({
    id: 'req-e2e-002',
    orgName: 'Tech College of Approval',
    orgType: 'COLLEGE',
    status: 'APPROVED',
    estimatedUsers: 800,
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockAdminGraphQL(page, {
      requests: [pendingRequest, approvedRequest],
    });
    await page.goto(`${BASE_URL}${ADMIN_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="pilot-requests-table"]')
      .waitFor({ timeout: 20_000 });
  });

  test('requests table is visible when data is loaded', async ({ page }) => {
    await expect(
      page.locator('[data-testid="pilot-requests-table"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('table shows org name of pending request', async ({ page }) => {
    await expect(
      page.getByText('State University of Testing'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('table shows org name of approved request', async ({ page }) => {
    await expect(
      page.getByText('Tech College of Approval'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('PENDING status badge is visible for pending request', async ({
    page,
  }) => {
    await expect(page.getByText('PENDING')).toBeVisible({ timeout: 10_000 });
  });

  test('APPROVED status badge is visible for approved request', async ({
    page,
  }) => {
    await expect(page.getByText('APPROVED')).toBeVisible({ timeout: 10_000 });
  });

  test('Approve button is present for pending request row', async ({
    page,
  }) => {
    await expect(
      page.locator(`[data-testid="approve-btn-${pendingRequest.id}"]`),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Reject button is present for pending request row', async ({ page }) => {
    await expect(
      page.locator(`[data-testid="reject-btn-${pendingRequest.id}"]`),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('table has column headers: Org Name, Type, Email, Est. Users, Status, Actions', async ({
    page,
  }) => {
    const table = page.locator('[data-testid="pilot-requests-table"]');
    for (const header of [
      'Org Name',
      'Type',
      'Email',
      'Est. Users',
      'Status',
      'Actions',
    ]) {
      await expect(table.getByText(header)).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ─── Suite 3: Empty state ─────────────────────────────────────────────────────

test.describe('Pilot Requests Admin Page — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockAdminGraphQL(page, { requests: [] });
    await page.goto(`${BASE_URL}${ADMIN_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="pilot-requests-page"]')
      .waitFor({ timeout: 15_000 });
  });

  test('shows empty state message when no pilot requests exist', async ({
    page,
  }) => {
    await expect(
      page.getByText(/No pilot requests yet/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('requests table is NOT rendered in empty state', async ({ page }) => {
    await page.waitForTimeout(500); // let data settle
    await expect(
      page.locator('[data-testid="pilot-requests-table"]'),
    ).not.toBeVisible();
  });

  test('no raw error strings in empty state', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 4: Approve modal ───────────────────────────────────────────────────

test.describe('Pilot Requests Admin Page — Approve Modal', () => {
  const pendingRequest = makePilotRequest({ id: 'req-approve-001' });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockAdminGraphQL(page, { requests: [pendingRequest] });
    await page.goto(`${BASE_URL}${ADMIN_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="pilot-requests-table"]')
      .waitFor({ timeout: 20_000 });
  });

  test('clicking Approve button opens the approval modal', async ({ page }) => {
    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    await expect(
      page.getByRole('dialog', { name: /Approve Pilot Request/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('approval modal contains seat limit input', async ({ page }) => {
    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Approve Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await expect(page.locator('#seatLimit')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#seatLimit')).toHaveAttribute('type', 'number');
  });

  test('approval modal has default seat limit value of 100', async ({
    page,
  }) => {
    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Approve Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await expect(page.locator('#seatLimit')).toHaveValue('100');
  });

  test('Cancel button in approve modal closes the modal', async ({ page }) => {
    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    const dialog = page.getByRole('dialog', {
      name: /Approve Pilot Request/i,
    });
    await dialog.waitFor({ timeout: 10_000 });
    // Use evaluate() — Radix dialog backdrop intercepts touch events on mobile-chrome
    await clickDialogButton(page, 'Cancel');
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('Confirm Approval button triggers approvePilotRequest mutation', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');

    const mutationCalled = new Promise<void>((resolve) => {
      page.on('request', (req) => {
        if (req.method() !== 'POST' || !req.url().includes('graphql')) return;
        try {
          const body = JSON.parse(req.postData() ?? '{}') as {
            operationName?: string;
          };
          const op = (body.operationName ?? '').toLowerCase();
          if (op.includes('approve')) resolve();
        } catch {
          // ignore parse errors
        }
      });
    });

    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    const dialog = page.getByRole('dialog', {
      name: /Approve Pilot Request/i,
    });
    await dialog.waitFor({ timeout: 10_000 });
    // Update seat limit
    await page.locator('#seatLimit').fill('200');
    // Use evaluate() — Radix dialog backdrop intercepts touch events on mobile-chrome
    await clickDialogButton(page, 'Confirm Approval');
    // Mutation must have been called
    await expect(mutationCalled).resolves.toBeUndefined();
  });

  test('no raw error strings after opening approve modal', async ({ page }) => {
    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Approve Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await assertNoRawErrors(page);
  });

  test('visual regression — approve modal open state', async ({ page }) => {
    await clickByTestId(page, `approve-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Approve Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('pilot-admin-approve-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── Suite 5: Reject modal ────────────────────────────────────────────────────

test.describe('Pilot Requests Admin Page — Reject Modal', () => {
  const pendingRequest = makePilotRequest({ id: 'req-reject-001' });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockAdminGraphQL(page, { requests: [pendingRequest] });
    await page.goto(`${BASE_URL}${ADMIN_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="pilot-requests-table"]')
      .waitFor({ timeout: 20_000 });
  });

  test('clicking Reject button opens the rejection modal', async ({ page }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    await expect(
      page.getByRole('dialog', { name: /Reject Pilot Request/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('rejection modal contains reason textarea', async ({ page }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Reject Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await expect(page.locator('#rejectReason')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('Confirm Rejection button is disabled when reason is empty', async ({
    page,
  }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    const dialog = page.getByRole('dialog', {
      name: /Reject Pilot Request/i,
    });
    await dialog.waitFor({ timeout: 10_000 });
    await expect(
      dialog.getByRole('button', { name: /Confirm Rejection/i }),
    ).toBeDisabled({ timeout: 5_000 });
  });

  test('Confirm Rejection button is enabled after entering a reason', async ({
    page,
  }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    const dialog = page.getByRole('dialog', {
      name: /Reject Pilot Request/i,
    });
    await dialog.waitFor({ timeout: 10_000 });
    await page
      .locator('#rejectReason')
      .fill('Insufficient capacity in your region at this time.');
    await expect(
      dialog.getByRole('button', { name: /Confirm Rejection/i }),
    ).not.toBeDisabled({ timeout: 5_000 });
  });

  test('Cancel button in reject modal closes the modal', async ({ page }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    const dialog = page.getByRole('dialog', {
      name: /Reject Pilot Request/i,
    });
    await dialog.waitFor({ timeout: 10_000 });
    // Use evaluate() — Radix dialog backdrop intercepts touch events on mobile-chrome
    await clickDialogButton(page, 'Cancel');
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('confirming rejection triggers rejectPilotRequest mutation', async ({
    page,
  }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');

    const mutationCalled = new Promise<void>((resolve) => {
      page.on('request', (req) => {
        if (req.method() !== 'POST' || !req.url().includes('graphql')) return;
        try {
          const body = JSON.parse(req.postData() ?? '{}') as {
            operationName?: string;
          };
          const op = (body.operationName ?? '').toLowerCase();
          if (op.includes('reject')) resolve();
        } catch {
          // ignore parse errors
        }
      });
    });

    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    const dialog = page.getByRole('dialog', {
      name: /Reject Pilot Request/i,
    });
    await dialog.waitFor({ timeout: 10_000 });
    await page
      .locator('#rejectReason')
      .fill('Budget constraints prevent onboarding new pilots this quarter.');
    // Use evaluate() — Radix dialog backdrop intercepts touch events on mobile-chrome
    await clickDialogButton(page, 'Confirm Rejection');
    await expect(mutationCalled).resolves.toBeUndefined();
  });

  test('no raw error strings after opening reject modal', async ({ page }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Reject Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await assertNoRawErrors(page);
  });

  test('visual regression — reject modal with reason filled', async ({
    page,
  }) => {
    await clickByTestId(page, `reject-btn-${pendingRequest.id}`);
    await page
      .getByRole('dialog', { name: /Reject Pilot Request/i })
      .waitFor({ timeout: 10_000 });
    await page
      .locator('#rejectReason')
      .fill('Insufficient capacity in your region at this time.');
    await expect(page).toHaveScreenshot('pilot-admin-reject-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

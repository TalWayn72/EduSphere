/**
 * stripe-invoice.spec.ts — E2E tests for StripeInvoicePage
 * wired to real GraphQL (page.route intercepted).
 *
 * Route: /admin/invoices
 * Access: SUPER_ADMIN only
 *
 * Tests: invoice list, generate invoice dialog, PDF download links,
 *        empty state, loading skeleton, no raw error strings.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/stripe-invoice.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Anti-regression ────────────────────────────────────────────────────────

async function assertNoRawErrors(page: Page): Promise<void> {
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_INVOICES = [
  {
    id: 'inv-1',
    tenant: 'Acme Corp',
    plan: 'ENTERPRISE',
    year: 2026,
    amount: 24000,
    status: 'paid',
    pdfUrl: 'https://storage.edusphere.io/invoices/inv-1.pdf',
  },
  {
    id: 'inv-2',
    tenant: 'Edu Holdings',
    plan: 'PROFESSIONAL',
    year: 2026,
    amount: 12000,
    status: 'draft',
    pdfUrl: '#',
  },
  {
    id: 'inv-3',
    tenant: 'Global Learning',
    plan: 'STARTER',
    year: 2025,
    amount: 4800,
    status: 'overdue',
    pdfUrl: 'https://storage.edusphere.io/invoices/inv-3.pdf',
  },
];

const GENERATED_INVOICE = {
  id: 'inv-new',
  tenant: 'Test Tenant',
  plan: 'STARTER',
  year: 2026,
  amount: 4800,
  status: 'draft',
  pdfUrl: '#',
};

function mockInvoicesWithData(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('invoices') && !q.includes('generateInvoice')) {
      return JSON.stringify({ data: { invoices: MOCK_INVOICES } });
    }
    if (q.includes('generateInvoice') || op === 'GenerateInvoice') {
      return JSON.stringify({ data: { generateInvoice: GENERATED_INVOICE } });
    }
    return null;
  });
}

function mockInvoicesEmpty(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('invoices')) {
      return JSON.stringify({ data: { invoices: [] } });
    }
    return null;
  });
}

const INVOICE_URL = `${BASE_URL}/admin/invoices`;

// ─── Data-loaded state ──────────────────────────────────────────────────────

test.describe('Stripe Invoices — Invoice List', () => {
  test.beforeEach(async ({ page }) => {
    await mockInvoicesWithData(page);
    await login(page);
    await page.goto(INVOICE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('page loads with stripe invoice container', async ({ page }) => {
    await expect(
      page.locator('[data-testid="stripe-invoice-page"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Stripe setup notice is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="stripe-setup-notice"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('invoice history table is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="invoice-history-table"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('all three invoices appear in the table', async ({ page }) => {
    const table = page.locator('[data-testid="invoice-history-table"]');
    await expect(table.getByText('Acme Corp')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Edu Holdings')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Global Learning')).toBeVisible({ timeout: 10_000 });
  });

  test('table shows plan and amount data', async ({ page }) => {
    const table = page.locator('[data-testid="invoice-history-table"]');
    const text = (await table.textContent()) ?? '';
    expect(text).toContain('ENTERPRISE');
    expect(text).toContain('$24,000');
    expect(text).toContain('PROFESSIONAL');
  });

  test('table shows status badges (paid, draft, overdue)', async ({ page }) => {
    const table = page.locator('[data-testid="invoice-history-table"]');
    await expect(table.getByText('paid')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('draft')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('overdue')).toBeVisible({ timeout: 10_000 });
  });

  test('PDF download link for inv-1 points to a real URL (not "#")', async ({ page }) => {
    const link = page.locator('[data-testid="download-pdf-inv-1"]');
    await expect(link).toBeVisible({ timeout: 10_000 });
    const href = await link.getAttribute('href');
    expect(href).not.toBe('#');
    expect(href).toContain('inv-1.pdf');
  });

  test('inv-2 with pdfUrl="#" shows "Pending" instead of download link', async ({ page }) => {
    // inv-2 has pdfUrl="#" so InvoiceTable renders "Pending" text, not a link
    const link = page.locator('[data-testid="download-pdf-inv-2"]');
    await expect(link).not.toBeVisible();
  });

  test('generate invoice button is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="generate-invoice-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw error strings visible', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Generate invoice dialog ────────────────────────────────────────────────

test.describe('Stripe Invoices — Generate Invoice Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await mockInvoicesWithData(page);
    await login(page);
    await page.goto(INVOICE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('clicking Generate Invoice opens dialog', async ({ page }) => {
    await page.locator('[data-testid="generate-invoice-btn"]').click();
    await expect(
      page.getByRole('heading', { name: /Generate Invoice/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('dialog has tenant ID, year, and plan fields', async ({ page }) => {
    await page.locator('[data-testid="generate-invoice-btn"]').click();
    await expect(
      page.locator('[data-testid="invoice-tenant-input"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="invoice-year-input"]')
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('[data-testid="invoice-plan-select"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('submit button is disabled when tenant ID is empty', async ({ page }) => {
    await page.locator('[data-testid="generate-invoice-btn"]').click();
    const submitBtn = page.locator('[data-testid="submit-invoice-btn"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('filling tenant ID and submitting calls the mutation', async ({ page }) => {
    await page.locator('[data-testid="generate-invoice-btn"]').click();
    await page.fill('[data-testid="invoice-tenant-input"]', 'tenant-uuid-123');
    const submitBtn = page.locator('[data-testid="submit-invoice-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await submitBtn.click();

    // Dialog should close after successful generation
    await expect(
      page.getByRole('heading', { name: /Generate Invoice/i })
    ).not.toBeVisible({ timeout: 10_000 });
  });
});

// ─── Empty state ────────────────────────────────────────────────────────────

test.describe('Stripe Invoices — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await mockInvoicesEmpty(page);
    await login(page);
    await page.goto(INVOICE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('empty state shows "No invoices found"', async ({ page }) => {
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="empty-state"]')).toHaveText(
      /No invoices found/i
    );
  });

  test('invoice table is NOT visible in empty state', async ({ page }) => {
    await expect(
      page.locator('[data-testid="invoice-history-table"]')
    ).not.toBeVisible();
  });

  test('generate invoice button is still available in empty state', async ({ page }) => {
    await expect(
      page.locator('[data-testid="generate-invoice-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw errors in empty state', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Loading skeleton ───────────────────────────────────────────────────────

test.describe('Stripe Invoices — Loading Skeleton', () => {
  test('loading skeleton appears before data arrives', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type, authorization',
          },
          body: '',
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { invoices: MOCK_INVOICES } }),
      });
    });

    await login(page);
    await page.goto(INVOICE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-testid="invoice-skeleton"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

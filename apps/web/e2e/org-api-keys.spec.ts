/**
 * org-api-keys.spec.ts — E2E tests for Org API Key Management.
 *
 * Route: /admin/api-keys (requires ORG_ADMIN auth)
 *
 * Covers:
 *   - Generate new API key
 *   - Set scopes (LTI, SCIM, webhook, BI)
 *   - Key displayed once then masked
 *   - Revoke key
 *   - Key list display
 *   - Visual regression
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, RUN_WRITE_TESTS } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const API_KEYS_ROUTE = '/admin/api-keys';

async function mockApiKeyAPIs(page: import('@playwright/test').Page): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (op === 'ListApiKeys' || op.toLowerCase().includes('listapi') || op.toLowerCase().includes('apikey')) {
      return JSON.stringify({
        data: {
          apiKeys: [
            { id: 'k1', description: 'BI Export Key', hashPrefix: 'abc1****', scopes: ['bi:export'], isActive: true, lastUsedAt: '2026-03-20T10:00:00Z', createdAt: '2026-01-15T08:00:00Z' },
            { id: 'k2', description: 'LTI Integration', hashPrefix: 'xyz9****', scopes: ['lti:read'], isActive: true, lastUsedAt: null, createdAt: '2026-02-01T12:00:00Z' },
            { id: 'k3', description: 'Old Key', hashPrefix: 'old0****', scopes: ['bi:export'], isActive: false, lastUsedAt: '2025-12-01T00:00:00Z', createdAt: '2025-06-01T00:00:00Z' },
          ],
        },
      });
    }
    if (op === 'GenerateApiKey' || op.toLowerCase().includes('generate')) {
      return JSON.stringify({
        data: {
          generateApiKey: {
            id: 'k-new',
            rawKey: 'edusphere_live_k_abc123def456ghi789jkl012mno345pqr678',
            description: 'New Test Key',
            hashPrefix: 'abc1****',
            scopes: ['bi:export'],
          },
        },
      });
    }
    if (op === 'RevokeApiKey' || op.toLowerCase().includes('revoke')) {
      return JSON.stringify({
        data: { revokeApiKey: { id: 'k1', isActive: false } },
      });
    }
    if (op === 'Me' || op.toLowerCase().includes('me')) {
      return JSON.stringify({
        data: { me: { id: 'user-001', roles: ['ORG_ADMIN'], tenantId: 'tenant-001' } },
      });
    }
    return null;
  });
}

test.describe('API Keys — List', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiKeyAPIs(page);
    await page.goto(`${BASE_URL}${API_KEYS_ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="api-keys-page"]').waitFor({ timeout: 15_000 });
  });

  test('displays list of API keys', async ({ page }) => {
    await expect(page.getByText('BI Export Key')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('LTI Integration')).toBeVisible();
  });

  test('shows hash prefix, not full key', async ({ page }) => {
    await expect(page.getByText('abc1****')).toBeVisible({ timeout: 10_000 });
    // Full key should NOT be visible
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('edusphere_live_k_');
  });

  test('shows active/revoked status', async ({ page }) => {
    await expect(page.locator('[data-testid="key-status-active"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="key-status-revoked"]')).toBeVisible();
  });

  test('shows scope badges for each key', async ({ page }) => {
    await expect(page.getByText('bi:export').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('lti:read')).toBeVisible();
  });

  test('generate key button is present', async ({ page }) => {
    await expect(page.locator('[data-testid="btn-generate-key"]')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('API Keys — Generate', () => {
  test('clicking generate opens form', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockApiKeyAPIs(page);
    await page.goto(`${BASE_URL}${API_KEYS_ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="api-keys-page"]').waitFor({ timeout: 15_000 });

    await page.locator('[data-testid="btn-generate-key"]').click();
    await expect(page.locator('[data-testid="generate-key-modal"]')).toBeVisible({ timeout: 5_000 });
  });

  test('generated key is displayed only once with copy button', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockApiKeyAPIs(page);
    await page.goto(`${BASE_URL}${API_KEYS_ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="api-keys-page"]').waitFor({ timeout: 15_000 });

    await page.locator('[data-testid="btn-generate-key"]').click();
    await page.locator('[data-testid="generate-key-modal"]').waitFor({ timeout: 5_000 });

    // Fill form
    await page.locator('[data-testid="input-key-description"]').fill('New Test Key');
    await page.locator('[data-testid="scope-bi-export"]').click();
    await page.locator('[data-testid="btn-confirm-generate"]').click();

    // Raw key should be displayed
    await expect(page.locator('[data-testid="raw-key-display"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="btn-copy-key"]')).toBeVisible();

    // Warning about one-time display
    await expect(page.getByText(/copy.*now/i)).toBeVisible();
  });
});

test.describe('API Keys — Revoke', () => {
  test('revoke button shows confirmation dialog', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockApiKeyAPIs(page);
    await page.goto(`${BASE_URL}${API_KEYS_ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="api-keys-page"]').waitFor({ timeout: 15_000 });

    await page.locator('[data-testid="btn-revoke-key"]').first().click();
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('API Keys — Visual', () => {
  test('visual regression — API keys page', async ({ page }) => {
    await mockApiKeyAPIs(page);
    await page.goto(`${BASE_URL}${API_KEYS_ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="api-keys-page"]').waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('api-keys-page.png', { maxDiffPixelRatio: 0.05 });
  });
});

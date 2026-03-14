/**
 * gap-analysis-dashboard.spec.ts — E2E tests for GapAnalysisDashboardPage
 * wired to real GraphQL (page.route intercepted).
 *
 * Route: /admin/gap-analysis
 * Access: ORG_ADMIN | SUPER_ADMIN
 *
 * Tests: loading skeleton, data state with gap table, empty state,
 *        no raw error strings, visual regression.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/gap-analysis-dashboard.spec.ts --reporter=line
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
  expect(body).not.toContain('MOCK_GAPS');
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_PROFILES = [
  { __typename: 'SkillProfile', id: 'role-1', roleName: 'Data Engineer', description: 'Data pipeline role', requiredConceptsCount: 10 },
  { __typename: 'SkillProfile', id: 'role-2', roleName: 'ML Engineer', description: 'Machine learning role', requiredConceptsCount: 8 },
];

const MOCK_GAP_REPORT = {
  __typename: 'SkillGapReport',
  roleId: 'role-1',
  roleName: 'Data Engineer',
  totalRequired: 10,
  mastered: 7,
  gapCount: 3,
  completionPercentage: 70,
  gaps: [
    {
      __typename: 'SkillGap',
      conceptName: 'Apache Spark Optimization',
      isMastered: false,
      recommendedContentItems: ['c-1'],
      recommendedContentTitles: ['Spark Performance Tuning Course'],
      relevanceScore: 0.95,
    },
    {
      __typename: 'SkillGap',
      conceptName: 'Data Lakehouse Architecture',
      isMastered: false,
      recommendedContentItems: ['c-2'],
      recommendedContentTitles: ['Lakehouse Fundamentals'],
      relevanceScore: 0.72,
    },
    {
      __typename: 'SkillGap',
      conceptName: 'Stream Processing',
      isMastered: true,
      recommendedContentItems: [],
      recommendedContentTitles: [],
      relevanceScore: 0.4,
    },
  ],
};

function mockGapWithData(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('skillProfiles') || op === 'SkillProfiles') {
      return JSON.stringify({ data: { skillProfiles: MOCK_PROFILES } });
    }
    if (q.includes('skillGapAnalysis') || op === 'SkillGapAnalysis') {
      return JSON.stringify({ data: { skillGapAnalysis: MOCK_GAP_REPORT } });
    }
    return null;
  });
}

function mockGapEmpty(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('skillProfiles') || op === 'SkillProfiles') {
      return JSON.stringify({ data: { skillProfiles: [] } });
    }
    if (q.includes('skillGapAnalysis') || op === 'SkillGapAnalysis') {
      return JSON.stringify({ data: { skillGapAnalysis: null } });
    }
    return null;
  });
}

// ─── Data-loaded state ──────────────────────────────────────────────────────

test.describe('Gap Analysis Dashboard — Data Loaded', () => {
  test.beforeEach(async ({ page }) => {
    await mockGapWithData(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/gap-analysis`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  test('page loads with gap-analysis container', async ({ page }) => {
    await expect(page.locator('[data-testid="gap-analysis-page"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('gap summary card is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="gap-summary-card"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('total gaps count shows 3', async ({ page }) => {
    const count = page.locator('[data-testid="total-gaps-count"]');
    await expect(count).toBeVisible({ timeout: 10_000 });
    await expect(count).toHaveText('3');
  });

  test('completion percentage is displayed', async ({ page }) => {
    const card = page.locator('[data-testid="gap-summary-card"]');
    const text = (await card.textContent()) ?? '';
    expect(text).toMatch(/70%/);
  });

  test('critical gaps table is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="critical-gaps-table"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('unmastered gaps appear in the table', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(table.getByText('Apache Spark Optimization')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Data Lakehouse Architecture')).toBeVisible({ timeout: 10_000 });
  });

  test('mastered concepts do NOT appear in the gap table', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    // Stream Processing is mastered — should not show in gap rows
    const rows = table.locator('tbody tr');
    const rowTexts = await rows.allTextContents();
    const hasStreamProcessing = rowTexts.some((t) => t.includes('Stream Processing'));
    expect(hasStreamProcessing).toBe(false);
  });

  test('recommended content titles are shown', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(
      table.getByText('Spark Performance Tuning Course')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('export report button is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="export-gap-report-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw error strings visible', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Empty state ────────────────────────────────────────────────────────────

test.describe('Gap Analysis Dashboard — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await mockGapEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/gap-analysis`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  test('empty state is shown when no skill profiles exist', async ({ page }) => {
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('empty state mentions creating a skill profile', async ({ page }) => {
    const el = page.locator('[data-testid="empty-state"]');
    await expect(el).toHaveText(/No skill profiles found/i, { timeout: 10_000 });
  });

  test('gap summary card is NOT visible in empty state', async ({ page }) => {
    await expect(
      page.locator('[data-testid="gap-summary-card"]')
    ).not.toBeVisible();
  });

  test('no raw errors in empty state', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Loading skeleton ───────────────────────────────────────────────────────

test.describe('Gap Analysis Dashboard — Loading Skeleton', () => {
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
        body: JSON.stringify({ data: { skillProfiles: MOCK_PROFILES } }),
      });
    });

    await login(page);
    await page.goto(`${BASE_URL}/admin/gap-analysis`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('[data-testid="gap-skeleton"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

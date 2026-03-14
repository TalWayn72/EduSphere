/**
 * auto-grading-results.spec.ts — E2E tests for the AutoGradingResultsPage
 * wired to real GraphQL (page.route intercepted).
 *
 * Route: /admin/auto-grading?submissionId=<id>
 * Access: INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN
 *
 * Tests: loading skeleton, data-loaded state, empty state, no raw error strings,
 *        no MOCK_RESULTS text, score colour coding, visual regression.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/auto-grading-results.spec.ts --reporter=line
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
  expect(body).not.toContain('MOCK_RESULTS');
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_GRADING_RESULTS = [
  {
    __typename: 'GradingResult',
    questionId: 'q1',
    score: 8,
    maxScore: 10,
    explanation: 'Good understanding of GraphQL federation concepts.',
    suggestions: ['Review chapter 3 for deeper coverage'],
  },
  {
    __typename: 'GradingResult',
    questionId: 'q2',
    score: 5,
    maxScore: 10,
    explanation: 'Partial understanding of RLS policies.',
    suggestions: ['Practice with flashcards', 'Read the security section'],
  },
];

function mockGradingWithData(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('autoGradingResults') || op === 'AutoGradingResults') {
      return JSON.stringify({
        data: { autoGradingResults: MOCK_GRADING_RESULTS },
      });
    }
    return null;
  });
}

function mockGradingEmpty(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('autoGradingResults') || op === 'AutoGradingResults') {
      return JSON.stringify({ data: { autoGradingResults: [] } });
    }
    return null;
  });
}

function mockGradingLoading(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('autoGradingResults') || op === 'AutoGradingResults') {
      // Return a promise that never resolves to keep the loading state
      return null; // Will return empty data, but we check skeleton before data arrives
    }
    return null;
  });
}

// ─── Data-loaded state ──────────────────────────────────────────────────────

test.describe('Auto-Grading Results — Data Loaded', () => {
  test.beforeEach(async ({ page }) => {
    await mockGradingWithData(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/auto-grading?submissionId=sub-e2e-001`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  test('page loads with auto-grading container', async ({ page }) => {
    await expect(page.locator('[data-testid="auto-grading-page"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('overall score summary is rendered with correct percentage', async ({ page }) => {
    const summary = page.locator('[data-testid="overall-score-summary"]');
    await expect(summary).toBeVisible({ timeout: 10_000 });
    const text = (await summary.textContent()) ?? '';
    // (8+5)/(10+10)*100 = 65%
    expect(text).toMatch(/65%/);
  });

  test('q1 result card shows score 8/10', async ({ page }) => {
    const q1 = page.locator('[data-testid="grading-result-q1"]');
    await expect(q1).toBeVisible({ timeout: 10_000 });
    const text = (await q1.textContent()) ?? '';
    expect(text).toMatch(/8\/10/);
  });

  test('q2 result card shows suggestions', async ({ page }) => {
    const q2 = page.locator('[data-testid="grading-result-q2"]');
    await expect(q2).toBeVisible({ timeout: 10_000 });
    const text = (await q2.textContent()) ?? '';
    expect(text).toMatch(/Practice with flashcards/);
  });

  test('no MOCK_RESULTS text visible on the page', async ({ page }) => {
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('MOCK_RESULTS');
    expect(body).not.toContain('mock_results');
  });

  test('no raw technical error strings visible', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  test('privacy notice is visible', async ({ page }) => {
    const notice = page.locator('[data-testid="privacy-notice"]');
    await expect(notice).toBeVisible({ timeout: 10_000 });
  });

  test('export button is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="export-grading-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('score >= 80% renders green colour class (q1)', async ({ page }) => {
    const q1 = page.locator('[data-testid="grading-result-q1"]');
    await expect(q1).toBeVisible({ timeout: 10_000 });
    const cls = (await q1.getAttribute('class')) ?? '';
    expect(cls).toMatch(/green/);
  });

  test('score < 60% renders red colour class (q2)', async ({ page }) => {
    const q2 = page.locator('[data-testid="grading-result-q2"]');
    await expect(q2).toBeVisible({ timeout: 10_000 });
    const cls = (await q2.getAttribute('class')) ?? '';
    expect(cls).toMatch(/red/);
  });
});

// ─── Empty state ────────────────────────────────────────────────────────────

test.describe('Auto-Grading Results — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await mockGradingEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/auto-grading?submissionId=sub-e2e-empty`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  test('empty state message is visible when no results', async ({ page }) => {
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('empty state says "No grading results yet"', async ({ page }) => {
    const el = page.locator('[data-testid="empty-state"]');
    await expect(el).toHaveText(/No grading results yet/i, { timeout: 10_000 });
  });

  test('overall score summary is NOT visible in empty state', async ({ page }) => {
    await expect(
      page.locator('[data-testid="overall-score-summary"]')
    ).not.toBeVisible();
  });

  test('no raw errors in empty state', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Loading skeleton ───────────────────────────────────────────────────────

test.describe('Auto-Grading Results — Loading Skeleton', () => {
  test('loading skeleton appears before data arrives', async ({ page }) => {
    // Delay the GraphQL response so we can observe the skeleton
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
      // Delay response by 3 seconds to keep loading state visible
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { autoGradingResults: MOCK_GRADING_RESULTS },
        }),
      });
    });

    await login(page);
    await page.goto(`${BASE_URL}/admin/auto-grading?submissionId=sub-e2e-loading`, {
      waitUntil: 'domcontentloaded',
    });

    // Skeleton should be visible during loading
    await expect(page.locator('[data-testid="grading-skeleton"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

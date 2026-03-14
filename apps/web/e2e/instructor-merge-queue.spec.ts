/**
 * instructor-merge-queue.spec.ts — E2E tests for InstructorMergeQueuePage
 * wired to real GraphQL (page.route intercepted).
 *
 * Route: /instructor/merge-queue?courseId=<id>
 * Access: INSTRUCTOR (DEV_MODE auto-login satisfies guard)
 *
 * Tests: pending proposals display, approve button calls mutation,
 *        reject dialog with reason field, empty state, loading skeleton,
 *        no raw error strings.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/instructor-merge-queue.spec.ts --reporter=line
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

const MOCK_PROPOSALS = [
  {
    __typename: 'AnnotationProposal',
    id: 'prop-1',
    annotationId: 'ann-1',
    content: 'GraphQL Federation resolves entities via @key directive.',
    description: 'This clarifies the entity resolution mechanism for federation.',
    authorName: 'Alice Student',
    courseId: 'course-1',
    courseName: 'GraphQL Mastery',
    contentTimestamp: 125,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  },
  {
    __typename: 'AnnotationProposal',
    id: 'prop-2',
    annotationId: 'ann-2',
    content: 'RLS policies use SET LOCAL for per-transaction tenant isolation.',
    description: 'Important security detail for multi-tenant architecture.',
    authorName: 'Bob Learner',
    courseId: 'course-1',
    courseName: 'GraphQL Mastery',
    contentTimestamp: 340,
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending',
  },
];

let approvedIds: string[] = [];
let rejectedIds: string[] = [];

function mockMergeQueueWithData(page: Page): Promise<void> {
  approvedIds = [];
  rejectedIds = [];
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('pendingAnnotationProposals') || op === 'PendingAnnotationProposals') {
      return JSON.stringify({
        data: { pendingAnnotationProposals: MOCK_PROPOSALS },
      });
    }
    if (q.includes('approveAnnotationProposal') || op === 'ApproveAnnotationProposal') {
      const vars = body.variables as Record<string, string> | undefined;
      approvedIds.push(vars?.proposalId ?? '');
      return JSON.stringify({
        data: { approveAnnotationProposal: { __typename: 'AnnotationProposal', id: vars?.proposalId, status: 'approved' } },
      });
    }
    if (q.includes('rejectAnnotationProposal') || op === 'RejectAnnotationProposal') {
      const vars = body.variables as Record<string, string> | undefined;
      rejectedIds.push(vars?.proposalId ?? '');
      return JSON.stringify({
        data: { rejectAnnotationProposal: { __typename: 'AnnotationProposal', id: vars?.proposalId, status: 'rejected' } },
      });
    }
    return null;
  });
}

function mockMergeQueueEmpty(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('pendingAnnotationProposals') || op === 'PendingAnnotationProposals') {
      return JSON.stringify({
        data: { pendingAnnotationProposals: [] },
      });
    }
    return null;
  });
}

const QUEUE_URL = `${BASE_URL}/instructor/merge-queue?courseId=course-1`;

// ─── Data-loaded state ──────────────────────────────────────────────────────

test.describe('Instructor Merge Queue — Pending Proposals', () => {
  test.beforeEach(async ({ page }) => {
    await mockMergeQueueWithData(page);
    await login(page);
    await page.goto(QUEUE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('page heading says "Annotation Proposals"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Annotation Proposals/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('merge queue list is visible with proposal cards', async ({ page }) => {
    await expect(
      page.locator('[data-testid="merge-queue-list"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('first proposal card shows author name', async ({ page }) => {
    const card = page.locator('[data-testid="merge-request-prop-1"]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('Alice Student');
  });

  test('second proposal card shows course name', async ({ page }) => {
    const card = page.locator('[data-testid="merge-request-prop-2"]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('GraphQL Mastery');
  });

  test('proposal content is displayed in the card', async ({ page }) => {
    const content = page.locator('[data-testid="proposal-content-prop-1"]');
    await expect(content).toBeVisible({ timeout: 10_000 });
    const text = (await content.textContent()) ?? '';
    expect(text).toContain('GraphQL Federation resolves entities');
  });

  test('approve button is visible on each card', async ({ page }) => {
    await expect(
      page.locator('[data-testid="approve-btn-prop-1"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="approve-btn-prop-2"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('reject button is visible on each card', async ({ page }) => {
    await expect(
      page.locator('[data-testid="reject-btn-prop-1"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('approve button calls the approve mutation', async ({ page }) => {
    const btn = page.locator('[data-testid="approve-btn-prop-1"]');
    await btn.click();
    // Wait for the mutation response to resolve
    await page.waitForTimeout(500);
    expect(approvedIds).toContain('prop-1');
  });

  test('reject button opens the reject dialog with reason field', async ({ page }) => {
    const btn = page.locator('[data-testid="reject-btn-prop-1"]');
    await btn.click();

    // Dialog should open
    await expect(
      page.getByRole('heading', { name: /Reject Proposal/i })
    ).toBeVisible({ timeout: 10_000 });

    // Reason textarea should be present
    await expect(
      page.locator('[data-testid="reject-reason-input"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('reject dialog description warns about notification', async ({ page }) => {
    await page.locator('[data-testid="reject-btn-prop-1"]').click();
    const body = (await page.textContent('[role="dialog"]')) ?? '';
    expect(body).toMatch(/student will be notified/i);
  });

  test('no raw error strings on page', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Empty state ────────────────────────────────────────────────────────────

test.describe('Instructor Merge Queue — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await mockMergeQueueEmpty(page);
    await login(page);
    await page.goto(QUEUE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('empty state message "No pending proposals" is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="empty-state"]')).toHaveText(
      /No pending proposals/i
    );
  });

  test('merge queue list is NOT visible in empty state', async ({ page }) => {
    await expect(
      page.locator('[data-testid="merge-queue-list"]')
    ).not.toBeVisible();
  });

  test('no raw errors in empty state', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Loading skeleton ───────────────────────────────────────────────────────

test.describe('Instructor Merge Queue — Loading Skeleton', () => {
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
        body: JSON.stringify({
          data: { pendingAnnotationProposals: MOCK_PROPOSALS },
        }),
      });
    });

    await login(page);
    await page.goto(QUEUE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-testid="merge-skeleton"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

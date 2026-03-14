/**
 * feature-wiring-visual.spec.ts — Visual regression screenshots for
 * the 5 feature pages wired from mock to real GraphQL.
 *
 * For each page: one screenshot in data-loaded state, one in empty state.
 * Uses toHaveScreenshot() for Playwright visual comparison.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/feature-wiring-visual.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Shared mock data ───────────────────────────────────────────────────────

const MOCK_GRADING = [
  { questionId: 'q1', score: 8, maxScore: 10, explanation: 'Good answer.', suggestions: [] },
  { questionId: 'q2', score: 5, maxScore: 10, explanation: 'Needs work.', suggestions: ['Study more'] },
];

const MOCK_PROFILES = [
  { id: 'role-1', roleName: 'Data Engineer', description: 'Data role', requiredConceptsCount: 10 },
];

const MOCK_GAP_REPORT = {
  roleId: 'role-1',
  roleName: 'Data Engineer',
  totalRequired: 10,
  mastered: 7,
  gapCount: 3,
  completionPercentage: 70,
  gaps: [
    { conceptName: 'Spark', isMastered: false, recommendedContentItems: ['c-1'], recommendedContentTitles: ['Spark Course'], relevanceScore: 0.9 },
    { conceptName: 'Kafka', isMastered: false, recommendedContentItems: ['c-2'], recommendedContentTitles: ['Kafka Course'], relevanceScore: 0.7 },
    { conceptName: 'SQL', isMastered: true, recommendedContentItems: [], recommendedContentTitles: [], relevanceScore: 0.3 },
  ],
};

const MOCK_PROPOSALS = [
  {
    id: 'prop-1', annotationId: 'ann-1', content: 'Federation resolves via @key.',
    description: 'Clarification.', authorName: 'Alice', courseId: 'c-1',
    courseName: 'GraphQL Mastery', contentTimestamp: 60, submittedAt: new Date().toISOString(), status: 'pending',
  },
];

const MOCK_PARTNER = {
  status: 'ACTIVE',
  apiKey: 'esph_live_abc123def456ghi789',
  revenueByMonth: [
    { month: '2026-01', grossRevenue: 10000, platformCut: 3000, payout: 7000, status: 'PAID' },
    { month: '2026-02', grossRevenue: 12500, platformCut: 3750, payout: 8750, status: 'PENDING' },
  ],
};

const MOCK_INVOICES = [
  { id: 'inv-1', tenant: 'Acme Corp', plan: 'ENTERPRISE', year: 2026, amount: 24000, status: 'paid', pdfUrl: 'https://example.com/inv-1.pdf' },
  { id: 'inv-2', tenant: 'Edu Holdings', plan: 'PROFESSIONAL', year: 2026, amount: 12000, status: 'draft', pdfUrl: '#' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockAllData(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('autoGradingResults')) return JSON.stringify({ data: { autoGradingResults: MOCK_GRADING } });
    if (q.includes('skillProfiles')) return JSON.stringify({ data: { skillProfiles: MOCK_PROFILES } });
    if (q.includes('skillGapAnalysis')) return JSON.stringify({ data: { skillGapAnalysis: MOCK_GAP_REPORT } });
    if (q.includes('pendingAnnotationProposals')) return JSON.stringify({ data: { pendingAnnotationProposals: MOCK_PROPOSALS } });
    if (q.includes('myPartnerDashboard')) return JSON.stringify({ data: { myPartnerDashboard: MOCK_PARTNER } });
    if (q.includes('invoices') && !q.includes('generate')) return JSON.stringify({ data: { invoices: MOCK_INVOICES } });
    return null;
  });
}

function mockAllEmpty(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('autoGradingResults')) return JSON.stringify({ data: { autoGradingResults: [] } });
    if (q.includes('skillProfiles')) return JSON.stringify({ data: { skillProfiles: [] } });
    if (q.includes('skillGapAnalysis')) return JSON.stringify({ data: { skillGapAnalysis: null } });
    if (q.includes('pendingAnnotationProposals')) return JSON.stringify({ data: { pendingAnnotationProposals: [] } });
    if (q.includes('myPartnerDashboard')) return JSON.stringify({ data: { myPartnerDashboard: null } });
    if (q.includes('invoices') && !q.includes('generate')) return JSON.stringify({ data: { invoices: [] } });
    return null;
  });
}

const SCREENSHOT_OPTS = { fullPage: false, animations: 'disabled' as const };

// ─── Visual: Auto-Grading Results ───────────────────────────────────────────

test.describe('Visual — Auto-Grading Results', () => {
  test('data-loaded state screenshot', async ({ page }) => {
    await mockAllData(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/auto-grading?submissionId=sub-vis`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="auto-grading-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('auto-grading-data.png', SCREENSHOT_OPTS);
  });

  test('empty state screenshot', async ({ page }) => {
    await mockAllEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/auto-grading?submissionId=sub-vis-empty`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('auto-grading-empty.png', SCREENSHOT_OPTS);
  });
});

// ─── Visual: Gap Analysis Dashboard ─────────────────────────────────────────

test.describe('Visual — Gap Analysis Dashboard', () => {
  test('data-loaded state screenshot', async ({ page }) => {
    await mockAllData(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/gap-analysis`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="gap-analysis-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('gap-analysis-data.png', SCREENSHOT_OPTS);
  });

  test('empty state screenshot', async ({ page }) => {
    await mockAllEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/gap-analysis`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('gap-analysis-empty.png', SCREENSHOT_OPTS);
  });
});

// ─── Visual: Instructor Merge Queue ─────────────────────────────────────────

test.describe('Visual — Instructor Merge Queue', () => {
  test('data-loaded state screenshot', async ({ page }) => {
    await mockAllData(page);
    await login(page);
    await page.goto(`${BASE_URL}/instructor/merge-queue?courseId=c-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="merge-queue-list"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('merge-queue-data.png', SCREENSHOT_OPTS);
  });

  test('empty state screenshot', async ({ page }) => {
    await mockAllEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/instructor/merge-queue?courseId=c-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('merge-queue-empty.png', SCREENSHOT_OPTS);
  });
});

// ─── Visual: Partner Dashboard ──────────────────────────────────────────────

test.describe('Visual — Partner Dashboard', () => {
  test('data-loaded state screenshot', async ({ page }) => {
    await mockAllData(page);
    await login(page);
    await page.goto(`${BASE_URL}/partner/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="partner-dashboard-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('partner-dashboard-data.png', SCREENSHOT_OPTS);
  });

  test('empty state screenshot', async ({ page }) => {
    await mockAllEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/partner/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('partner-dashboard-empty.png', SCREENSHOT_OPTS);
  });
});

// ─── Visual: Stripe Invoices ────────────────────────────────────────────────

test.describe('Visual — Stripe Invoices', () => {
  test('data-loaded state screenshot', async ({ page }) => {
    await mockAllData(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="stripe-invoice-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('stripe-invoices-data.png', SCREENSHOT_OPTS);
  });

  test('empty state screenshot', async ({ page }) => {
    await mockAllEmpty(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('stripe-invoices-empty.png', SCREENSHOT_OPTS);
  });
});

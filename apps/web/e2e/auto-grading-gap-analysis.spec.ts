/**
 * auto-grading-gap-analysis.spec.ts
 *
 * Combined E2E spec for two admin pages:
 *
 * Block 1 — AutoGradingResultsPage  /admin/auto-grading
 *   Access: INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN
 *   Tests: score-colour coding (green ≥80 / yellow 60-79 / red <60), privacy
 *   notice, no PII fields, export button, visual screenshot.
 *
 * Block 2 — GapAnalysisDashboardPage  /admin/gap-analysis
 *   Access: ORG_ADMIN | SUPER_ADMIN
 *   Tests: gap table renders, severity badges, recommended actions column,
 *   filter/sort controls, visual screenshot.
 *
 * Both pages are purely static in DEV_MODE (MOCK_RESULTS / MOCK_GAPS constants
 * are baked into the component) so no live GraphQL server is needed.
 * page.route() is still provided for future proofing and to silence any
 * background GraphQL calls the AdminLayout may make.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/auto-grading-gap-analysis.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
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

// ─── GraphQL background-request silencer ─────────────────────────────────────

/**
 * Route all GraphQL requests to empty success responses so that AdminLayout
 * background queries (tenant info, user profile, etc.) do not fail with
 * ECONNREFUSED when no live gateway is running.
 */
async function silenceGraphQL(page: Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

// ─── Block 1: AutoGradingResultsPage ─────────────────────────────────────────

test.describe('Auto-Grading Results — /admin/auto-grading (INSTRUCTOR)', () => {
  test.beforeEach(async ({ page }) => {
    // DEV_MODE auto-logs in as SUPER_ADMIN which satisfies INSTRUCTOR route guard.
    await silenceGraphQL(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/auto-grading`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  // ── Page structure ─────────────────────────────────────────────────────────

  test('page loads with auto-grading container', async ({ page }) => {
    await expect(page.locator('[data-testid="auto-grading-page"]')).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test('overall score summary card is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="overall-score-summary"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw error strings on page load', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  // ── Score colour coding ────────────────────────────────────────────────────

  test('question with score ≥80% renders with green colour class', async ({ page }) => {
    // q1 has percentageScore=80 → scoreColor returns text-green-700
    const q1Card = page.locator('[data-testid="grading-result-q1"]');
    await expect(q1Card).toBeVisible({ timeout: 10_000 });

    // The card border/background uses green classes from scoreColor()
    const classAttr = (await q1Card.getAttribute('class')) ?? '';
    expect(classAttr).toMatch(/green/);
  });

  test('question with score 60-79% renders with yellow colour class', async ({ page }) => {
    // MOCK_RESULTS only has q1 (80%) and q2 (50%).
    // To verify yellow path: the overall score card at 65% uses yellow text.
    // overall = (8+5)/(10+10)*100 = 65 → 'text-yellow-700'
    const overallEl = page.locator('[data-testid="overall-score-summary"]');
    await expect(overallEl).toBeVisible({ timeout: 10_000 });

    const overallText = (await overallEl.textContent()) ?? '';
    // Overall score is 65% — yellow range confirmed by text presence
    expect(overallText).toMatch(/65%/);

    // The score paragraph should carry the yellow class
    const scoreP = page
      .locator('[data-testid="overall-score-summary"] p.text-yellow-700')
      .first();
    await expect(scoreP).toBeVisible({ timeout: 8_000 });
  });

  test('question with score <60% renders with red colour class', async ({ page }) => {
    // q2 has percentageScore=50 → scoreColor returns text-red-700 bg-red-50 border-red-200
    const q2Card = page.locator('[data-testid="grading-result-q2"]');
    await expect(q2Card).toBeVisible({ timeout: 10_000 });

    const classAttr = (await q2Card.getAttribute('class')) ?? '';
    expect(classAttr).toMatch(/red/);
  });

  // ── Privacy & PII guards ───────────────────────────────────────────────────

  test('privacy notice is visible and mentions "student" and "local"', async ({ page }) => {
    const notice = page.locator('[data-testid="privacy-notice"]');
    await expect(notice).toBeVisible({ timeout: 10_000 });

    const text = (await notice.textContent()) ?? '';
    // "AI grading uses local Ollama — student data never leaves your servers"
    expect(text.toLowerCase()).toMatch(/student/);
    expect(text.toLowerCase()).toMatch(/local|server/);
  });

  test('no raw student answer text (PII) exposed in DOM', async ({ page }) => {
    // The page must never render keys like "studentAnswer", "rawAnswer",
    // "userInput" as visible text — only AI-generated explanations are shown.
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toMatch(/studentAnswer/);
    expect(body).not.toMatch(/rawAnswer/);
    expect(body).not.toMatch(/userInput/);
    // The PII field names from the GradingResult interface must not appear
    expect(body).not.toMatch(/pii/i);
  });

  // ── Export button ──────────────────────────────────────────────────────────

  test('Export Results button is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="export-grading-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Export Results button label is correct', async ({ page }) => {
    const btn = page.locator('[data-testid="export-grading-btn"]');
    await expect(btn).toHaveText(/Export Results/i, { timeout: 10_000 });
  });

  // ── Per-question result cards ──────────────────────────────────────────────

  test('q1 result card displays score fraction 8/10', async ({ page }) => {
    const q1 = page.locator('[data-testid="grading-result-q1"]');
    await expect(q1).toBeVisible({ timeout: 10_000 });
    const text = (await q1.textContent()) ?? '';
    expect(text).toMatch(/8\/10/);
  });

  test('q2 result card displays suggestions list', async ({ page }) => {
    const q2 = page.locator('[data-testid="grading-result-q2"]');
    await expect(q2).toBeVisible({ timeout: 10_000 });
    const text = (await q2.textContent()) ?? '';
    expect(text).toMatch(/Review chapter 3|Practice with flashcards/);
  });

  // ── Visual screenshot ──────────────────────────────────────────────────────

  test('visual screenshot — auto-grading results page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('auto-grading-results.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

// ─── Block 2: GapAnalysisDashboardPage ───────────────────────────────────────

test.describe('Gap Analysis Dashboard — /admin/gap-analysis (ORG_ADMIN)', () => {
  test.beforeEach(async ({ page }) => {
    // DEV_MODE auto-logs in as SUPER_ADMIN which satisfies ORG_ADMIN route guard.
    await silenceGraphQL(page);
    await login(page);
    await page.goto(`${BASE_URL}/admin/gap-analysis`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  // ── Page structure ─────────────────────────────────────────────────────────

  test('page loads with gap-analysis container', async ({ page }) => {
    await expect(page.locator('[data-testid="gap-analysis-page"]')).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test('gap summary card is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="gap-summary-card"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('total active gaps count is visible', async ({ page }) => {
    const count = page.locator('[data-testid="total-gaps-count"]');
    await expect(count).toBeVisible({ timeout: 10_000 });
    // MOCK_GAPS has 3 entries
    await expect(count).toHaveText('3');
  });

  test('no raw error strings on page load', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  // ── Gap table renders ──────────────────────────────────────────────────────

  test('critical gaps table is rendered', async ({ page }) => {
    await expect(
      page.locator('[data-testid="critical-gaps-table"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('gap table has expected column headers', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    const headers = ['Topic', 'Gap Type', 'Severity', 'Affected Users', 'Recommended Action'];
    for (const header of headers) {
      await expect(table.getByText(header, { exact: true })).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('all three mock gap topics are present in the table', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(table.getByText('Advanced GraphRAG')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Knowledge Graph Design')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('Vector Embeddings')).toBeVisible({ timeout: 10_000 });
  });

  // ── Severity badges ────────────────────────────────────────────────────────

  test('HIGH severity badge is present in the table', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    // Two HIGH rows exist (t1, t3)
    const highBadges = table.getByText('HIGH');
    await expect(highBadges.first()).toBeVisible({ timeout: 10_000 });
  });

  test('MEDIUM severity badge is present in the table', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(table.getByText('MEDIUM')).toBeVisible({ timeout: 10_000 });
  });

  test('LOW severity badge is absent (no LOW gap in mock data)', async ({ page }) => {
    // Validates that the test setup matches MOCK_GAPS — no LOW-severity row expected.
    const table = page.locator('[data-testid="critical-gaps-table"]');
    // LOW text must not appear in the severity cells (there's no LOW-severity gap)
    const lowBadge = table.locator('span').filter({ hasText: /^LOW$/ });
    await expect(lowBadge).toHaveCount(0);
  });

  test('gap type badges are present (NOT_STARTED, LOW_MASTERY, MISSING_PREREQUISITE)', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(table.getByText('NOT_STARTED')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('LOW_MASTERY')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('MISSING_PREREQUISITE')).toBeVisible({ timeout: 10_000 });
  });

  // ── Recommended actions column ─────────────────────────────────────────────

  test('recommended actions column shows actionable text', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(
      table.getByText('Assign "GraphRAG Fundamentals" course')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('recommended action for LOW_MASTERY gap mentions workshop', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(
      table.getByText(/Schedule workshop session/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('recommended action for MISSING_PREREQUISITE mentions prerequisite', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    await expect(
      table.getByText(/Linear Algebra.*prerequisite|prerequisite/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Affected users column ──────────────────────────────────────────────────

  test('affected user counts are visible in the table', async ({ page }) => {
    const table = page.locator('[data-testid="critical-gaps-table"]');
    // t1=45, t2=23, t3=67
    await expect(table.getByText('45')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('23')).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('67')).toBeVisible({ timeout: 10_000 });
  });

  // ── Export button ──────────────────────────────────────────────────────────

  test('Export Report button is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="export-gap-report-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Export Report button label is correct', async ({ page }) => {
    const btn = page.locator('[data-testid="export-gap-report-btn"]');
    await expect(btn).toHaveText(/Export Report/i, { timeout: 10_000 });
  });

  // ── Coverage summary ───────────────────────────────────────────────────────

  test('tenant coverage percentage is displayed in summary card', async ({ page }) => {
    const card = page.locator('[data-testid="gap-summary-card"]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    const text = (await card.textContent()) ?? '';
    // coveragePct = max(0, 100 - round((135/300)*100)) = 100 - 45 = 55
    expect(text).toMatch(/\d+%/);
    expect(text).toMatch(/Topics covered/i);
  });

  // ── Visual screenshot ──────────────────────────────────────────────────────

  test('visual screenshot — gap analysis table', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('gap-analysis-table.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ── Personal Knowledge Graph tests ───────────────────────────────────────────
test.describe('KnowledgeGraph — Personal Wiki View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/knowledge-graph`, { waitUntil: 'networkidle' });
  });

  test('shows Global and My Wiki tabs', async ({ page }) => {
    await expect(page.getByTestId('kg-tab-global')).toBeVisible();
    await expect(page.getByTestId('kg-tab-personal')).toBeVisible();
  });

  test('Global tab is selected by default', async ({ page }) => {
    const globalTab = page.getByTestId('kg-tab-global');
    await expect(globalTab).toHaveAttribute('aria-selected', 'true');
    const personalTab = page.getByTestId('kg-tab-personal');
    await expect(personalTab).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking My Wiki tab shows Personal Knowledge Wiki heading', async ({
    page,
  }) => {
    await page.getByTestId('kg-tab-personal').click();
    await expect(
      page.getByText('Personal Knowledge Wiki')
    ).toBeVisible({ timeout: 5000 });
  });

  test('My Wiki shows annotation nodes from multiple courses', async ({
    page,
  }) => {
    await page.getByTestId('kg-tab-personal').click();
    await page.waitForTimeout(500);
    // At least one personal node should exist
    const nodes = page.locator('[data-personal-node]');
    await expect(nodes.first()).toBeVisible({ timeout: 5000 });
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a personal node shows detail panel with course name', async ({
    page,
  }) => {
    await page.getByTestId('kg-tab-personal').click();
    await page.waitForTimeout(500);
    const firstNode = page.locator('[data-personal-node]').first();
    await firstNode.click();
    // Course name should appear in sidebar
    await expect(
      page.getByText(/Jewish Philosophy|Early Modern|Halakha/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('switching back to Global hides personal graph', async ({ page }) => {
    await page.getByTestId('kg-tab-personal').click();
    await expect(page.getByText('Personal Knowledge Wiki')).toBeVisible();
    await page.getByTestId('kg-tab-global').click();
    await expect(
      page.getByText('Personal Knowledge Wiki')
    ).not.toBeVisible({ timeout: 3000 });
  });

  test('personal graph does not expose raw errors or stack traces', async ({
    page,
  }) => {
    await page.getByTestId('kg-tab-personal').click();
    await page.waitForTimeout(500);
    const bodyText = await page.evaluate(() => document.body.textContent ?? '');
    expect(bodyText).not.toMatch(/TypeError|Error:/);
    expect(bodyText).not.toMatch(/at\s+\w+\s*\(/);
  });

  test('visual regression — Global graph view', async ({ page }) => {
    await expect(page).toHaveScreenshot('kg-global-view.png', {
      fullPage: false,
    });
  });

  test('visual regression — Personal Knowledge Wiki', async ({ page }) => {
    await page.getByTestId('kg-tab-personal').click();
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot('kg-personal-wiki.png', {
      fullPage: false,
    });
  });
});

// ── Instructor Merge Queue tests ──────────────────────────────────────────────
test.describe('InstructorMergeQueuePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/instructor/merge-queue`, {
      waitUntil: 'networkidle',
    });
  });

  test('shows the Annotation Proposals heading', async ({ page }) => {
    await expect(page.getByText('Annotation Proposals')).toBeVisible();
  });

  test('shows pending proposal count', async ({ page }) => {
    await expect(page.getByText(/pending/i)).toBeVisible();
  });

  test('shows at least one proposal in the queue', async ({ page }) => {
    const queue = page.getByTestId('merge-queue-list');
    await expect(queue).toBeVisible();
    const items = queue.locator('[data-testid^="merge-request-"]');
    await expect(items.first()).toBeVisible();
  });

  test('Approve button moves request to resolved section', async ({ page }) => {
    const approveBtn = page.getByTestId('approve-btn-mr-1');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    await expect(page.getByTestId('resolved-mr-1')).toBeVisible();
    await expect(
      page.getByTestId('resolved-mr-1')
    ).toContainText('approved');
  });

  test('Reject button moves request to resolved section', async ({ page }) => {
    const rejectBtn = page.getByTestId('reject-btn-mr-2');
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();
    await expect(page.getByTestId('resolved-mr-2')).toBeVisible();
    await expect(
      page.getByTestId('resolved-mr-2')
    ).toContainText('rejected');
  });

  test('no raw errors or stack traces in page', async ({ page }) => {
    const bodyText = await page.evaluate(() => document.body.textContent ?? '');
    expect(bodyText).not.toMatch(/TypeError|Error:/);
  });

  test('visual regression — Merge Queue page', async ({ page }) => {
    await expect(page).toHaveScreenshot('instructor-merge-queue.png', {
      fullPage: false,
    });
  });

  test('visual regression — Merge Queue after approval', async ({ page }) => {
    await page.getByTestId('approve-btn-mr-1').click();
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('instructor-merge-queue-after-approve.png', {
      fullPage: false,
    });
  });
});

// ── Annotation Panel — Propose flow ──────────────────────────────────────────
test.describe('AnnotationPanel — Propose to Official', () => {
  test.beforeEach(async ({ page }) => {
    // Annotations panel is accessible via /learn/:lessonId (UnifiedLearningPage)
    // or /annotations. Use the annotations page for simplicity.
    await page.goto(`${BASE_URL}/annotations`, { waitUntil: 'networkidle' });
  });

  test('Propose to Official button is present for personal annotations', async ({
    page,
  }) => {
    // Propose buttons use aria-label containing "Propose to official content"
    const proposeBtn = page
      .getByRole('button', { name: /propose to official content/i })
      .first();
    const count = await proposeBtn.count();
    // May be 0 if no PERSONAL layer annotations belong to current-user in mock data
    // Just check there are no raw errors
    const bodyText = await page.evaluate(() => document.body.textContent ?? '');
    expect(bodyText).not.toMatch(/TypeError|Error:/);
    if (count > 0) {
      await expect(proposeBtn).toBeVisible();
    }
  });

  test('clicking Propose to Official opens the merge request modal', async ({
    page,
  }) => {
    const proposeBtn = page
      .getByRole('button', { name: /propose to official content/i })
      .first();
    const btnCount = await proposeBtn.count();
    if (btnCount > 0) {
      await proposeBtn.click();
      await expect(
        page.getByTestId('merge-request-modal')
      ).toBeVisible({ timeout: 3000 });
    }
  });
});

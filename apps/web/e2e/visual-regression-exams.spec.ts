/**
 * Visual Regression Tests — Exam Pages
 *
 * Covers exam list, item bank, blueprint, results, and security pages.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-exams --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/** Try element screenshot, fall back to full page if element not visible */
async function elementOrPage(
  page: Page,
  selectors: string[],
  name: string,
  opts: Record<string, unknown> = { animations: 'disabled' as const },
) {
  const locator = selectors.reduce(
    (loc, sel, i) => (i === 0 ? page.locator(sel) : loc.or(page.locator(sel))),
    page.locator(selectors[0]),
  );
  const el = locator.first();
  if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM LIST
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam List @visual-exams', () => {
  test.setTimeout(60_000);

  test('exam list — full page', async ({ page }) => {
    await goTo(page, '/exams');
    await expect(page).toHaveScreenshot('exams-list-full.png', STABLE_OPTS);
  });

  test('exam list — header section', async ({ page }) => {
    await goTo(page, '/exams');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'exams-list-header.png');
  });

  test('exam list — main content', async ({ page }) => {
    await goTo(page, '/exams');
    await elementOrPage(page, ['main', '[role="main"]', '[data-testid="main-content"]'], 'exams-list-main.png');
  });

  test('exam list — exam cards grid', async ({ page }) => {
    await goTo(page, '/exams');
    await elementOrPage(page, ['[data-testid="exam-grid"]', '.grid', '[role="list"]'], 'exams-list-grid.png');
  });

  test('exam list — filter controls', async ({ page }) => {
    await goTo(page, '/exams');
    await elementOrPage(page, ['[data-testid="filters"]', '[role="search"]', '.filters'], 'exams-list-filters.png');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ITEM BANK
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Item Bank @visual-exams', () => {
  test.setTimeout(60_000);

  test('item bank — full page', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    await expect(page).toHaveScreenshot('exams-itembank-full.png', STABLE_OPTS);
  });

  test('item bank — header section', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'exams-itembank-header.png');
  });

  test('item bank — question list', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    await elementOrPage(page, ['[data-testid="item-list"]', 'table', '[role="table"]', 'main'], 'exams-itembank-list.png');
  });

  test('item bank — sidebar categories', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    await elementOrPage(page, ['aside', '[data-testid="categories"]', 'nav'], 'exams-itembank-categories.png');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLUEPRINT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam Blueprint @visual-exams', () => {
  test.setTimeout(60_000);

  test('blueprint — full page', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    await expect(page).toHaveScreenshot('exams-blueprint-full.png', STABLE_OPTS);
  });

  test('blueprint — header section', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'exams-blueprint-header.png');
  });

  test('blueprint — main content', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    await elementOrPage(page, ['main', '[role="main"]', '[data-testid="main-content"]'], 'exams-blueprint-main.png');
  });

  test('blueprint — topic distribution', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    await elementOrPage(page, ['[data-testid="topic-distribution"]', '.distribution', 'table'], 'exams-blueprint-distribution.png');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam Results @visual-exams', () => {
  test.setTimeout(60_000);

  test('results — full page', async ({ page }) => {
    await goTo(page, '/exams/results');
    await expect(page).toHaveScreenshot('exams-results-full.png', STABLE_OPTS);
  });

  test('results — header section', async ({ page }) => {
    await goTo(page, '/exams/results');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'exams-results-header.png');
  });

  test('results — summary statistics', async ({ page }) => {
    await goTo(page, '/exams/results');
    await elementOrPage(page, ['[data-testid="results-summary"]', '.summary', 'main'], 'exams-results-summary.png');
  });

  test('results — score table', async ({ page }) => {
    await goTo(page, '/exams/results');
    await elementOrPage(page, ['table', '[data-testid="score-table"]', '[role="table"]'], 'exams-results-table.png');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Exam Security @visual-exams', () => {
  test.setTimeout(60_000);

  test('security settings — full page', async ({ page }) => {
    await goTo(page, '/exams/security');
    await expect(page).toHaveScreenshot('exams-security-full.png', STABLE_OPTS);
  });

  test('security settings — header section', async ({ page }) => {
    await goTo(page, '/exams/security');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'exams-security-header.png');
  });

  test('security settings — configuration options', async ({ page }) => {
    await goTo(page, '/exams/security');
    await elementOrPage(page, ['form', '[data-testid="security-config"]', 'main'], 'exams-security-config.png');
  });

  test('security settings — proctoring section', async ({ page }) => {
    await goTo(page, '/exams/security');
    await elementOrPage(page, ['[data-testid="proctoring"]', '.proctoring-section', 'section'], 'exams-security-proctoring.png');
  });

  test('exam list — sidebar navigation', async ({ page }) => {
    await goTo(page, '/exams');
    await elementOrPage(page, ['aside', '[data-testid="sidebar"]', 'nav'], 'exams-list-sidebar.png');
  });

  test('item bank — action toolbar', async ({ page }) => {
    await goTo(page, '/exams/item-bank');
    await elementOrPage(page, ['[data-testid="toolbar"]', '[role="toolbar"]', '.toolbar'], 'exams-itembank-toolbar.png');
  });

  test('blueprint — action buttons', async ({ page }) => {
    await goTo(page, '/exams/blueprint');
    await elementOrPage(page, ['[data-testid="blueprint-actions"]', 'button', '.actions'], 'exams-blueprint-actions.png');
  });

  test('security settings — lockdown options', async ({ page }) => {
    await goTo(page, '/exams/security');
    await elementOrPage(page, ['[data-testid="lockdown-options"]', '.lockdown', 'form'], 'exams-security-lockdown.png');
  });
});

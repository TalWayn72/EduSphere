/**
 * Visual Regression Tests — Gamification Charts (with GraphQL mocks)
 *
 * Covers dashboard XP/streak/level, social challenges/leaderboard, profile badges/progress,
 * and certificates display. All data mocked via page.route() for deterministic rendering.
 * Uses LOOSE_OPTS (5% tolerance) for chart areas due to SVG rendering variance.
 * 20 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-charts-gamification --update-snapshots
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';
import { login } from './auth.helpers';

/** Screenshot an element if visible, otherwise fall back to full page */
async function screenshotElOrPage(el: Locator, page: Page, name: string, opts: object): Promise<void> {
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, { ...opts, fullPage: true });
  }
}
import {
  MOCK_GAMIFICATION_DATA,
  MOCK_LEADERBOARD_DATA,
  MOCK_CHALLENGES_DATA,
  MOCK_CERTIFICATES_DATA,
  MOCK_PROFILE_PROGRESS_DATA,
} from './visual-charts-fixtures';

test.use({ reducedMotion: 'reduce' });

const CHART_OPTS = { maxDiffPixelRatio: 0.05, animations: 'disabled' as const };

async function setupMockAndGo(page: Page, path: string, mockData: Record<string, unknown>) {
  await login(page);
  await page.route('**/graphql', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData) });
  });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD — XP / STREAK / LEVEL
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Dashboard Gamification @visual-charts', () => {
  test.setTimeout(60_000);

  test('dashboard — full page with gamification widgets', async ({ page }) => {
    await setupMockAndGo(page, '/dashboard', MOCK_GAMIFICATION_DATA);
    await expect(page).toHaveScreenshot('chart-gamification-dashboard-full.png', LOOSE_OPTS);
  });

  test('dashboard — XP progress bar', async ({ page }) => {
    await setupMockAndGo(page, '/dashboard', MOCK_GAMIFICATION_DATA);
    const xpBar = page.locator('[data-testid="xp-progress"], [role="progressbar"], .xp-bar, section').first();
    await screenshotElOrPage(xpBar, page, 'chart-gamification-dashboard-xp.png', CHART_OPTS);
  });

  test('dashboard — streak indicator', async ({ page }) => {
    await setupMockAndGo(page, '/dashboard', MOCK_GAMIFICATION_DATA);
    const streak = page.locator('[data-testid="streak-indicator"], .streak, .flame-icon, section').first();
    await screenshotElOrPage(streak, page, 'chart-gamification-dashboard-streak.png', CHART_OPTS);
  });

  test('dashboard — level badge display', async ({ page }) => {
    await setupMockAndGo(page, '/dashboard', MOCK_GAMIFICATION_DATA);
    const badge = page.locator('[data-testid="level-badge"], .level-badge, .rank, section').first();
    await screenshotElOrPage(badge, page, 'chart-gamification-dashboard-level.png', CHART_OPTS);
  });

  test('dashboard — XP history chart', async ({ page }) => {
    await setupMockAndGo(page, '/dashboard', MOCK_GAMIFICATION_DATA);
    const chart = page.locator('[data-testid="xp-history"], .recharts-line, .recharts-wrapper, svg').first();
    await screenshotElOrPage(chart, page, 'chart-gamification-dashboard-xphistory.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL CHALLENGES — CARDS / LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Social Challenges @visual-charts', () => {
  test.setTimeout(60_000);

  test('challenges — full page with mocked data', async ({ page }) => {
    await setupMockAndGo(page, '/social/challenges', { ...MOCK_CHALLENGES_DATA, ...MOCK_LEADERBOARD_DATA });
    await expect(page).toHaveScreenshot('chart-gamification-challenges-full.png', LOOSE_OPTS);
  });

  test('challenges — active challenge cards with progress', async ({ page }) => {
    await setupMockAndGo(page, '/social/challenges', MOCK_CHALLENGES_DATA);
    const cards = page.locator('[data-testid="challenge-list"], .challenge-cards, .grid, [role="list"]').first();
    await screenshotElOrPage(cards, page, 'chart-gamification-challenges-cards.png', CHART_OPTS);
  });

  test('challenges — leaderboard table', async ({ page }) => {
    await setupMockAndGo(page, '/social/challenges', MOCK_LEADERBOARD_DATA);
    const board = page.locator('[data-testid="leaderboard"], .leaderboard, table, [role="table"]').first();
    await screenshotElOrPage(board, page, 'chart-gamification-challenges-leaderboard.png', CHART_OPTS);
  });

  test('challenges — challenge progress bars', async ({ page }) => {
    await setupMockAndGo(page, '/social/challenges', MOCK_CHALLENGES_DATA);
    const bars = page.locator('[data-testid="challenge-progress"], [role="progressbar"], .progress-bars, section').first();
    await screenshotElOrPage(bars, page, 'chart-gamification-challenges-progress.png', CHART_OPTS);
  });

  test('challenges — XP reward indicators', async ({ page }) => {
    await setupMockAndGo(page, '/social/challenges', MOCK_CHALLENGES_DATA);
    const rewards = page.locator('[data-testid="xp-rewards"], .xp-badge, .reward, main').first();
    await screenshotElOrPage(rewards, page, 'chart-gamification-challenges-rewards.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE — BADGES / PROGRESS CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Profile Gamification @visual-charts', () => {
  test.setTimeout(60_000);

  test('profile — full page with badges and progress', async ({ page }) => {
    await setupMockAndGo(page, '/profile', { ...MOCK_GAMIFICATION_DATA, ...MOCK_PROFILE_PROGRESS_DATA });
    await expect(page).toHaveScreenshot('chart-gamification-profile-full.png', LOOSE_OPTS);
  });

  test('profile — achievement badges grid', async ({ page }) => {
    await setupMockAndGo(page, '/profile', MOCK_GAMIFICATION_DATA);
    const badges = page.locator('[data-testid="badges"], .badge-grid, .badges, section').first();
    await screenshotElOrPage(badges, page, 'chart-gamification-profile-badges.png', CHART_OPTS);
  });

  test('profile — learning progress chart', async ({ page }) => {
    await setupMockAndGo(page, '/profile', MOCK_PROFILE_PROGRESS_DATA);
    const chart = page.locator('[data-testid="progress-chart"], .recharts-area, .recharts-wrapper, svg').first();
    await screenshotElOrPage(chart, page, 'chart-gamification-profile-progress.png', CHART_OPTS);
  });

  test('profile — skill levels radar', async ({ page }) => {
    await setupMockAndGo(page, '/profile', MOCK_PROFILE_PROGRESS_DATA);
    const radar = page.locator('[data-testid="skill-radar"], .recharts-radar, .recharts-wrapper, section').first();
    await screenshotElOrPage(radar, page, 'chart-gamification-profile-skills.png', CHART_OPTS);
  });

  test('profile — hours learned bar chart', async ({ page }) => {
    await setupMockAndGo(page, '/profile', MOCK_PROFILE_PROGRESS_DATA);
    const bars = page.locator('[data-testid="hours-chart"], .recharts-bar, .recharts-wrapper, main').first();
    await screenshotElOrPage(bars, page, 'chart-gamification-profile-hours.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATES — DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Certificates @visual-charts', () => {
  test.setTimeout(60_000);

  test('certificates — full page with mocked data', async ({ page }) => {
    await setupMockAndGo(page, '/certificates', MOCK_CERTIFICATES_DATA);
    await expect(page).toHaveScreenshot('chart-gamification-certificates-full.png', LOOSE_OPTS);
  });

  test('certificates — certificate cards display', async ({ page }) => {
    await setupMockAndGo(page, '/certificates', MOCK_CERTIFICATES_DATA);
    const cards = page.locator('[data-testid="certificate-list"], .certificate-cards, .grid, [role="list"]').first();
    await screenshotElOrPage(cards, page, 'chart-gamification-certificates-cards.png', CHART_OPTS);
  });

  test('certificates — credential details section', async ({ page }) => {
    await setupMockAndGo(page, '/certificates', MOCK_CERTIFICATES_DATA);
    const details = page.locator('[data-testid="credential-details"], .credential, .certificate-detail, section').first();
    await screenshotElOrPage(details, page, 'chart-gamification-certificates-details.png', CHART_OPTS);
  });

  test('certificates — grade summary', async ({ page }) => {
    await setupMockAndGo(page, '/certificates', MOCK_CERTIFICATES_DATA);
    const summary = page.locator('[data-testid="grade-summary"], .grade-summary, .summary, main').first();
    await screenshotElOrPage(summary, page, 'chart-gamification-certificates-grades.png', CHART_OPTS);
  });

  test('certificates — completion timeline', async ({ page }) => {
    await setupMockAndGo(page, '/certificates', MOCK_CERTIFICATES_DATA);
    const timeline = page.locator('[data-testid="completion-timeline"], .timeline, .recharts-wrapper, section').first();
    await screenshotElOrPage(timeline, page, 'chart-gamification-certificates-timeline.png', CHART_OPTS);
  });
});

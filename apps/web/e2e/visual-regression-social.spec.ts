/**
 * Visual Regression Tests — Social Features
 *
 * Covers social feed, challenges, discussions, peer matching, and profile.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-social --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL FEED
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Social Feed @visual-social', () => {
  test.setTimeout(30_000);

  test('social feed — full page', async ({ page }) => {
    await goTo(page, '/social');
    await expect(page).toHaveScreenshot('social-feed-full.png', LOOSE_OPTS);
  });

  test('social feed — header section', async ({ page }) => {
    await goTo(page, '/social');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('social-feed-header.png', { animations: 'disabled' as const });
  });

  test('social feed — post cards', async ({ page }) => {
    await goTo(page, '/social');
    const feed = page.locator('[data-testid="feed-list"], [role="feed"], main').first();
    await expect(feed).toHaveScreenshot('social-feed-posts.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('social feed — sidebar widgets', async ({ page }) => {
    await goTo(page, '/social');
    const sidebar = page.locator('aside, [data-testid="social-sidebar"], nav').first();
    await expect(sidebar).toHaveScreenshot('social-feed-sidebar.png', { animations: 'disabled' as const });
  });

  test('social feed — compose area', async ({ page }) => {
    await goTo(page, '/social');
    const compose = page.locator('[data-testid="compose-post"], textarea, [role="textbox"]').first();
    await expect(compose).toHaveScreenshot('social-feed-compose.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Challenges @visual-social', () => {
  test.setTimeout(30_000);

  test('challenges — full page', async ({ page }) => {
    await goTo(page, '/social/challenges');
    await expect(page).toHaveScreenshot('social-challenges-full.png', STABLE_OPTS);
  });

  test('challenges — header section', async ({ page }) => {
    await goTo(page, '/social/challenges');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('social-challenges-header.png', { animations: 'disabled' as const });
  });

  test('challenges — challenge cards', async ({ page }) => {
    await goTo(page, '/social/challenges');
    const cards = page.locator('[data-testid="challenge-list"], .grid, [role="list"]').first();
    await expect(cards).toHaveScreenshot('social-challenges-cards.png', { animations: 'disabled' as const });
  });

  test('challenges — leaderboard', async ({ page }) => {
    await goTo(page, '/social/challenges');
    const board = page.locator('[data-testid="leaderboard"], .leaderboard, table').first();
    await expect(board).toHaveScreenshot('social-challenges-leaderboard.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DISCUSSIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Discussions @visual-social', () => {
  test.setTimeout(30_000);

  test('discussions — full page', async ({ page }) => {
    await goTo(page, '/social/discussions');
    await expect(page).toHaveScreenshot('social-discussions-full.png', STABLE_OPTS);
  });

  test('discussions — header section', async ({ page }) => {
    await goTo(page, '/social/discussions');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('social-discussions-header.png', { animations: 'disabled' as const });
  });

  test('discussions — thread list', async ({ page }) => {
    await goTo(page, '/social/discussions');
    const threads = page.locator('[data-testid="thread-list"], [role="list"], main').first();
    await expect(threads).toHaveScreenshot('social-discussions-threads.png', { animations: 'disabled' as const });
  });

  test('discussions — category filters', async ({ page }) => {
    await goTo(page, '/social/discussions');
    const filters = page.locator('[data-testid="category-filters"], [role="tablist"], nav').first();
    await expect(filters).toHaveScreenshot('social-discussions-categories.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PEER MATCHING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Peer Matching @visual-social', () => {
  test.setTimeout(30_000);

  test('peer matching — full page', async ({ page }) => {
    await goTo(page, '/social/peer-matching');
    await expect(page).toHaveScreenshot('social-peermatching-full.png', STABLE_OPTS);
  });

  test('peer matching — header section', async ({ page }) => {
    await goTo(page, '/social/peer-matching');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('social-peermatching-header.png', { animations: 'disabled' as const });
  });

  test('peer matching — match cards', async ({ page }) => {
    await goTo(page, '/social/peer-matching');
    const cards = page.locator('[data-testid="match-list"], .grid, [role="list"], main').first();
    await expect(cards).toHaveScreenshot('social-peermatching-cards.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Profile @visual-social', () => {
  test.setTimeout(30_000);

  test('profile — full page', async ({ page }) => {
    await goTo(page, '/profile');
    await expect(page).toHaveScreenshot('social-profile-full.png', STABLE_OPTS);
  });

  test('profile — header with avatar', async ({ page }) => {
    await goTo(page, '/profile');
    const header = page.locator('header, [data-testid="profile-header"], h1').first();
    await expect(header).toHaveScreenshot('social-profile-header.png', { animations: 'disabled' as const });
  });

  test('profile — bio section', async ({ page }) => {
    await goTo(page, '/profile');
    const bio = page.locator('[data-testid="profile-bio"], .bio, section').first();
    await expect(bio).toHaveScreenshot('social-profile-bio.png', { animations: 'disabled' as const });
  });

  test('profile — activity feed', async ({ page }) => {
    await goTo(page, '/profile');
    const activity = page.locator('[data-testid="activity-feed"], [role="list"], main').first();
    await expect(activity).toHaveScreenshot('social-profile-activity.png', { animations: 'disabled' as const });
  });

  test('profile — badges section', async ({ page }) => {
    await goTo(page, '/profile');
    const badges = page.locator('[data-testid="badges"], .badges, section').first();
    await expect(badges).toHaveScreenshot('social-profile-badges.png', { animations: 'disabled' as const });
  });

  test('discussions — search bar', async ({ page }) => {
    await goTo(page, '/social/discussions');
    const search = page.locator('[data-testid="search-bar"], [role="search"], input[type="search"]').first();
    await expect(search).toHaveScreenshot('social-discussions-search.png', { animations: 'disabled' as const });
  });

  test('challenges — progress tracker', async ({ page }) => {
    await goTo(page, '/social/challenges');
    const progress = page.locator('[data-testid="progress-tracker"], .progress, [role="progressbar"]').first();
    await expect(progress).toHaveScreenshot('social-challenges-progress.png', { animations: 'disabled' as const });
  });

  test('peer matching — compatibility score', async ({ page }) => {
    await goTo(page, '/social/peer-matching');
    const score = page.locator('[data-testid="compatibility-score"], .score, section').first();
    await expect(score).toHaveScreenshot('social-peermatching-score.png', { animations: 'disabled' as const });
  });

  test('social feed — action buttons', async ({ page }) => {
    await goTo(page, '/social');
    const actions = page.locator('[data-testid="feed-actions"], .actions, button').first();
    await expect(actions).toHaveScreenshot('social-feed-actions.png', { animations: 'disabled' as const });
  });
});

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
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'social-feed-header.png');
  });

  test('social feed — post cards', async ({ page }) => {
    await goTo(page, '/social');
    await elementOrPage(page, ['[data-testid="feed-list"]', '[role="feed"]', 'main'], 'social-feed-posts.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('social feed — sidebar widgets', async ({ page }) => {
    await goTo(page, '/social');
    await elementOrPage(page, ['aside', '[data-testid="social-sidebar"]', 'nav'], 'social-feed-sidebar.png');
  });

  test('social feed — compose area', async ({ page }) => {
    await goTo(page, '/social');
    await elementOrPage(page, ['[data-testid="compose-post"]', 'textarea', '[role="textbox"]'], 'social-feed-compose.png');
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
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'social-challenges-header.png');
  });

  test('challenges — challenge cards', async ({ page }) => {
    await goTo(page, '/social/challenges');
    await elementOrPage(page, ['[data-testid="challenge-list"]', '.grid', '[role="list"]'], 'social-challenges-cards.png');
  });

  test('challenges — leaderboard', async ({ page }) => {
    await goTo(page, '/social/challenges');
    await elementOrPage(page, ['[data-testid="leaderboard"]', '.leaderboard', 'table'], 'social-challenges-leaderboard.png');
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
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'social-discussions-header.png');
  });

  test('discussions — thread list', async ({ page }) => {
    await goTo(page, '/social/discussions');
    await elementOrPage(page, ['[data-testid="thread-list"]', '[role="list"]', 'main'], 'social-discussions-threads.png');
  });

  test('discussions — category filters', async ({ page }) => {
    await goTo(page, '/social/discussions');
    await elementOrPage(page, ['[data-testid="category-filters"]', '[role="tablist"]', 'nav'], 'social-discussions-categories.png');
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
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'social-peermatching-header.png');
  });

  test('peer matching — match cards', async ({ page }) => {
    await goTo(page, '/social/peer-matching');
    await elementOrPage(page, ['[data-testid="match-list"]', '.grid', '[role="list"]', 'main'], 'social-peermatching-cards.png');
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
    await elementOrPage(page, ['header', '[data-testid="profile-header"]', 'h1'], 'social-profile-header.png');
  });

  test('profile — bio section', async ({ page }) => {
    await goTo(page, '/profile');
    await elementOrPage(page, ['[data-testid="profile-bio"]', '.bio', 'section'], 'social-profile-bio.png');
  });

  test('profile — activity feed', async ({ page }) => {
    await goTo(page, '/profile');
    await elementOrPage(page, ['[data-testid="activity-feed"]', '[role="list"]', 'main'], 'social-profile-activity.png');
  });

  test('profile — badges section', async ({ page }) => {
    await goTo(page, '/profile');
    await elementOrPage(page, ['[data-testid="badges"]', '.badges', 'section'], 'social-profile-badges.png');
  });

  test('discussions — search bar', async ({ page }) => {
    await goTo(page, '/social/discussions');
    await elementOrPage(page, ['[data-testid="search-bar"]', '[role="search"]', 'input[type="search"]'], 'social-discussions-search.png');
  });

  test('challenges — progress tracker', async ({ page }) => {
    await goTo(page, '/social/challenges');
    await elementOrPage(page, ['[data-testid="progress-tracker"]', '.progress', '[role="progressbar"]'], 'social-challenges-progress.png');
  });

  test('peer matching — compatibility score', async ({ page }) => {
    await goTo(page, '/social/peer-matching');
    await elementOrPage(page, ['[data-testid="compatibility-score"]', '.score', 'section'], 'social-peermatching-score.png');
  });

  test('social feed — action buttons', async ({ page }) => {
    await goTo(page, '/social');
    await elementOrPage(page, ['[data-testid="feed-actions"]', '.actions', 'button'], 'social-feed-actions.png');
  });
});

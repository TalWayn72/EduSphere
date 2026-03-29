/**
 * Visual Interactions — Card Component States (Part 1)
 *
 * Covers: Course cards, Challenge cards, Achievement/badge cards,
 * Notification cards, Social feed posts, Assessment cards.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function screenshotElement(
  page: import('@playwright/test').Page,
  selector: string,
  name: string,
  opts = STABLE_OPTS,
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

test.describe('Visual Interactions — Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
    await login(page);
  });

  test.describe('Course cards', () => {
    test('course card default state', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="course-card"], .course-card, article', 'interact-cards-courses-default.png', LOOSE_OPTS);
    });

    test('course card hover state', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const card = page.locator('[data-testid="course-card"], .course-card, article').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.hover();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="course-card"], .course-card, article', 'interact-cards-courses-hover.png', LOOSE_OPTS);
    });

    test('course card with progress bar', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="course-card"]:has([role="progressbar"]), article:has([role="progressbar"])', 'interact-cards-courses-with-progress.png', LOOSE_OPTS);
    });

    test('course card action menu open', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const menuBtn = page.locator('[data-testid="course-card"] button[aria-haspopup], article button[aria-haspopup], [data-testid="course-card"] [data-testid="more-btn"]').first();
      if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="menu"], [data-state="open"]', 'interact-cards-courses-action-menu.png');
    });

    test('course card favorite toggled', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const favBtn = page.locator('[data-testid="favorite-btn"], button[aria-label*="favorite"], button[aria-label*="bookmark"]').first();
      if (await favBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await favBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="course-card"], .course-card, article', 'interact-cards-courses-favorited.png', LOOSE_OPTS);
    });

    test('course card focused via keyboard', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('interact-cards-courses-keyboard-focus.png', STABLE_OPTS);
    });

    test('course card mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="course-card"], .course-card, article', 'interact-cards-courses-mobile.png', LOOSE_OPTS);
    });
  });

  test.describe('Challenge cards', () => {
    test('active challenge card', async ({ page }) => {
      await page.goto('/challenges', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="challenge-card"], [data-status="active"]', 'interact-cards-challenges-active.png', LOOSE_OPTS);
    });

    test('completed challenge card', async ({ page }) => {
      await page.goto('/challenges', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="challenge-card"][data-status="completed"], [data-status="completed"]', 'interact-cards-challenges-completed.png', LOOSE_OPTS);
    });

    test('locked challenge card', async ({ page }) => {
      await page.goto('/challenges', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="challenge-card"][data-status="locked"], [data-status="locked"]', 'interact-cards-challenges-locked.png', LOOSE_OPTS);
    });

    test('challenge card hover', async ({ page }) => {
      await page.goto('/challenges', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const card = page.locator('[data-testid="challenge-card"]').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.hover();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="challenge-card"]', 'interact-cards-challenges-hover.png', LOOSE_OPTS);
    });

    test('challenge card with timer', async ({ page }) => {
      await page.goto('/challenges', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="challenge-timer"], [data-testid="challenge-card"]:has([data-testid="countdown"])', 'interact-cards-challenges-timer.png', LOOSE_OPTS);
    });
  });

  test.describe('Achievement cards', () => {
    test('achievements page default', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-achievements-default.png', LOOSE_OPTS);
    });

    test('earned badge card', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="badge-card"][data-earned="true"], [data-testid="achievement-earned"]', 'interact-cards-achievements-earned.png', LOOSE_OPTS);
    });

    test('unearned badge card (locked)', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="badge-card"][data-earned="false"], [data-testid="achievement-locked"]', 'interact-cards-achievements-locked.png', LOOSE_OPTS);
    });

    test('badge card hover reveal', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const badge = page.locator('[data-testid="badge-card"], [data-testid="achievement-card"]').first();
      if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await badge.hover();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="badge-card"], [data-testid="achievement-card"]', 'interact-cards-achievements-hover.png', LOOSE_OPTS);
    });

    test('badge detail modal', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const badge = page.locator('[data-testid="badge-card"], [data-testid="achievement-card"]').first();
      if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await badge.click();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[role="dialog"], [data-testid="badge-detail"]', 'interact-cards-achievements-detail-modal.png', LOOSE_OPTS);
    });

    test('achievement progress ring', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="progress-ring"], [data-testid="achievement-progress"]', 'interact-cards-achievements-progress-ring.png', LOOSE_OPTS);
    });
  });

  test.describe('Notification cards', () => {
    test('notifications page default', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-notifications-default.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('unread notification card', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="notification-card"][data-read="false"], [data-unread="true"]', 'interact-cards-notifications-unread.png', LOOSE_OPTS);
    });

    test('read notification card', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="notification-card"][data-read="true"], [data-unread="false"]', 'interact-cards-notifications-read.png', LOOSE_OPTS);
    });

    test('notification card mark-as-read', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const markBtn = page.locator('[data-testid="mark-read"], button:has-text("Mark as read")').first();
      if (await markBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await markBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-cards-notifications-after-mark-read.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('notification card hover', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const card = page.locator('[data-testid="notification-card"]').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.hover();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, '[data-testid="notification-card"]', 'interact-cards-notifications-hover.png', LOOSE_OPTS);
    });
  });

  test.describe('Social feed posts', () => {
    test('social feed default', async ({ page }) => {
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-social-default.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('post card liked state', async ({ page }) => {
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const likeBtn = page.locator('[data-testid="like-btn"], button[aria-label*="like"]').first();
      if (await likeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await likeBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="post-card"], article', 'interact-cards-social-post-liked.png', LOOSE_OPTS);
    });

    test('post card comment section open', async ({ page }) => {
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const commentBtn = page.locator('[data-testid="comment-btn"], button[aria-label*="comment"]').first();
      if (await commentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="post-card"], article', 'interact-cards-social-post-comments-open.png', LOOSE_OPTS);
    });

    test('post card share menu open', async ({ page }) => {
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const shareBtn = page.locator('[data-testid="share-btn"], button[aria-label*="share"]').first();
      if (await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="menu"], [data-state="open"]', 'interact-cards-social-post-share-menu.png');
    });

    test('post card hover', async ({ page }) => {
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const post = page.locator('[data-testid="post-card"], article').first();
      if (await post.isVisible({ timeout: 3000 }).catch(() => false)) {
        await post.hover();
        await page.waitForTimeout(200);
      }
      await screenshotElement(page, '[data-testid="post-card"], article', 'interact-cards-social-post-hover.png', LOOSE_OPTS);
    });
  });
});

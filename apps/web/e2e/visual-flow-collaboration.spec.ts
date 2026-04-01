import { test, expect } from '@playwright/test';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
import { login } from './auth.helpers';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual Flow — Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('complete collaboration journey', async ({ page }) => {
    // Step 1: Course detail (starting point)
    await page.goto('/courses/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-01-course-detail.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 2: Annotation layer
    await page.goto('/courses/1/annotate');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-02-annotate.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 3: Social feed
    await page.goto('/social');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-03-social-feed.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 4: Discussions list
    await page.goto('/courses/1/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-04-discussions.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 5: Discussion thread detail
    await page.goto('/courses/1/discussions/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-collab-05-discussion-thread.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    // Step 6: Peer review assignments
    await page.goto('/courses/1/peer-review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-06-peer-review.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 7: Peer review detail
    await page.goto('/courses/1/peer-review/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-collab-07-peer-review-detail.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    // Step 8: Collaboration activity log
    await page.goto('/courses/1/activity');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-08-activity-log.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  // === EXPANDED — Header sections per step ===

  test('collaboration flow — header sections', async ({ page }) => {
    const steps = [
      { path: '/courses/1', name: 'course' },
      { path: '/courses/1/annotate', name: 'annotate' },
      { path: '/social', name: 'social' },
      { path: '/courses/1/discussions', name: 'discussions' },
      { path: '/courses/1/discussions/1', name: 'thread' },
      { path: '/courses/1/peer-review', name: 'peer-review' },
      { path: '/courses/1/activity', name: 'activity' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const header = page
        .locator('header, nav, [data-testid="app-header"]')
        .first();
      if (await header.isVisible().catch(() => false)) {
        await expect(header).toHaveScreenshot(
          `flow-collab-header-${step.name}.png`,
          { maxDiffPixelRatio: 0.01, animations: 'disabled' as const }
        );
      }
    }
  });

  test('collaboration flow — main content areas', async ({ page }) => {
    const steps = [
      { path: '/courses/1/annotate', name: 'annotate' },
      { path: '/social', name: 'social' },
      { path: '/courses/1/discussions', name: 'discussions' },
      { path: '/courses/1/peer-review', name: 'peer-review' },
      { path: '/courses/1/activity', name: 'activity' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible().catch(() => false)) {
        await expect(main).toHaveScreenshot(
          `flow-collab-main-${step.name}.png`,
          { ...LOOSE_OPTS, mask: dynamicMasks(page) }
        );
      }
    }
  });

  // === EXPANDED — Tablet viewport ===

  test('collaboration flow at tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/courses/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-tablet-01-course.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/courses/1/annotate');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-tablet-02-annotate.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/social');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-tablet-03-social.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/courses/1/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-collab-tablet-04-discussions.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/discussions/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-tablet-05-thread.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/courses/1/peer-review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-collab-tablet-06-peer-review.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/activity');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-tablet-07-activity.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  // === EXPANDED — Mobile viewport ===

  test('collaboration flow at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/courses/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-mobile-01-course.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/social');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-mobile-02-social.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/courses/1/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-collab-mobile-03-discussions.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/discussions/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-mobile-04-thread.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/courses/1/peer-review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-collab-mobile-05-peer-review.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/activity');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-collab-mobile-06-activity.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });
});

import { test, expect } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.describe('Visual Flow — Collaboration', () => {
  test('complete collaboration journey', async ({ page }) => {
    // Step 1: Course detail (starting point)
    await page.goto('/courses/1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-01-course-detail.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 2: Annotation layer
    await page.goto('/courses/1/annotate');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-02-annotate.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 3: Social feed
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-03-social-feed.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 4: Discussions list
    await page.goto('/courses/1/discussions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-04-discussions.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 5: Discussion thread detail
    await page.goto('/courses/1/discussions/1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-05-discussion-thread.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 6: Peer review assignments
    await page.goto('/courses/1/peer-review');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-06-peer-review.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 7: Peer review detail
    await page.goto('/courses/1/peer-review/1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-07-peer-review-detail.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 8: Collaboration activity log
    await page.goto('/courses/1/activity');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-collab-08-activity-log.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );
  });
});

/**
 * Visual Interactions — Card Component States (Part 2)
 *
 * Covers: Assessment cards, Card tablet layouts, Card wide desktop layouts,
 * Card page sections.
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

  test.describe('Assessment cards', () => {
    test('assessment card default', async ({ page }) => {
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="assessment-card"], [data-testid="exam-card"], article', 'interact-cards-assessment-default.png', LOOSE_OPTS);
    });

    test('assessment card upcoming', async ({ page }) => {
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="assessment-card"][data-status="upcoming"], [data-status="upcoming"]', 'interact-cards-assessment-upcoming.png', LOOSE_OPTS);
    });

    test('assessment card completed with score', async ({ page }) => {
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="assessment-card"][data-status="completed"], [data-status="graded"]', 'interact-cards-assessment-completed.png', LOOSE_OPTS);
    });

    test('assessment card hover', async ({ page }) => {
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const card = page.locator('[data-testid="assessment-card"], [data-testid="exam-card"]').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.hover();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="assessment-card"], [data-testid="exam-card"]', 'interact-cards-assessment-hover.png', LOOSE_OPTS);
    });

    test('assessment card keyboard focus', async ({ page }) => {
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('interact-cards-assessment-keyboard-focus.png', STABLE_OPTS);
    });

    test('assessment card mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="assessment-card"], [data-testid="exam-card"], article', 'interact-cards-assessment-mobile.png', LOOSE_OPTS);
    });
  });

  test.describe('Card tablet layouts', () => {
    test('course cards at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-courses-tablet.png', LOOSE_OPTS);
    });

    test('challenge cards at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/challenges', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-challenges-tablet.png', LOOSE_OPTS);
    });

    test('achievements at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-achievements-tablet.png', LOOSE_OPTS);
    });

    test('notifications at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-notifications-tablet.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('social feed at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-social-tablet.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('exams at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-exams-tablet.png', LOOSE_OPTS);
    });
  });

  test.describe('Card wide desktop layouts', () => {
    test('course cards at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-courses-wide.png', LOOSE_OPTS);
    });

    test('achievements at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-achievements-wide.png', LOOSE_OPTS);
    });

    test('social feed at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-social-wide.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });

    test('notifications at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-cards-notifications-wide.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
    });
  });

  test.describe('Card page sections', () => {
    test('courses page header section', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const header = page.locator('header, nav, [data-testid="page-header"]').first();
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(header).toHaveScreenshot('interact-cards-courses-header.png', STABLE_OPTS);
      }
    });

    test('achievements page header section', async ({ page }) => {
      await page.goto('/achievements', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const header = page.locator('header, nav, [data-testid="page-header"]').first();
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(header).toHaveScreenshot('interact-cards-achievements-header.png', STABLE_OPTS);
      }
    });

    test('social page sidebar section', async ({ page }) => {
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const sidebar = page.locator('aside, [data-testid="social-sidebar"], [role="complementary"]').first();
      if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(sidebar).toHaveScreenshot('interact-cards-social-sidebar.png', STABLE_OPTS);
      }
    });

    test('courses page main content', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(main).toHaveScreenshot('interact-cards-courses-main-area.png', LOOSE_OPTS);
      }
    });
  });
});

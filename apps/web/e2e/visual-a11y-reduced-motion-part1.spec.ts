/**
 * visual-a11y-reduced-motion-part1.spec.ts --- Accessibility Reduced Motion (Part 1)
 *
 * Covers: Dashboard, Knowledge Graph, Social, Analytics sections.
 * WCAG 2.3.3 — validates prefers-reduced-motion media query compliance.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.describe('Visual A11y -- Reduced Motion (Part 1) @visual @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  // --- Dashboard ---

  test('dashboard -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-motion-dashboard-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('dashboard -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page
      .getByTestId('app-sidebar')
      .or(page.locator('aside'))
      .first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot(
        'a11y-motion-dashboard-sidebar.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-dashboard-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('dashboard -- widgets no animation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-motion-dashboard-widgets.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-dashboard-widgets.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard -- topbar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page
      .getByTestId('topbar')
      .or(page.locator('header'))
      .first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot(
        'a11y-motion-dashboard-topbar.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-dashboard-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Knowledge Graph ---

  test('knowledge graph -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'a11y-motion-knowledge-graph-full.png',
      {
        ...LOOSE_OPTS,
        mask: dynamicMasks(page),
      }
    );
  });

  test('knowledge graph -- graph area static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot(
        'a11y-motion-knowledge-graph-content.png',
        {
          animations: 'disabled',
          mask: dynamicMasks(page),
        }
      );
    } else {
      await expect(page).toHaveScreenshot(
        'a11y-motion-knowledge-graph-content.png',
        {
          animations: 'disabled',
          mask: dynamicMasks(page),
        }
      );
    }
  });

  test('knowledge graph -- controls no animation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    const controls = page
      .locator('[data-testid="graph-controls"]')
      .or(page.locator('main section'))
      .first();
    if (await controls.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(controls).toHaveScreenshot(
        'a11y-motion-knowledge-graph-controls.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot(
        'a11y-motion-knowledge-graph-controls.png',
        {
          animations: 'disabled',
        }
      );
    }
  });

  // --- Social ---

  test('social -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-motion-social-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('social -- feed area static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-motion-social-feed.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-social-feed.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  // --- Analytics ---

  test('analytics -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-motion-analytics-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('analytics -- charts static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-motion-analytics-charts.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-analytics-charts.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('analytics -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page
      .getByTestId('app-sidebar')
      .or(page.locator('aside'))
      .first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot(
        'a11y-motion-analytics-sidebar.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-analytics-sidebar.png', {
        animations: 'disabled',
      });
    }
  });
});

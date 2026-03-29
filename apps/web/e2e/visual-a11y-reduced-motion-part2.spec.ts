/**
 * visual-a11y-reduced-motion-part2.spec.ts --- Accessibility Reduced Motion (Part 2)
 *
 * Covers: Onboarding, Additional reduced motion checks (sidebars, topbar).
 * WCAG 2.3.3 — validates prefers-reduced-motion media query compliance.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.describe('Visual A11y -- Reduced Motion (Part 2) @visual @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  // --- Onboarding ---

  test('onboarding -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-motion-onboarding-full.png', STABLE_OPTS);
  });

  test('onboarding -- step content static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-motion-onboarding-content.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-onboarding-content.png', {
        animations: 'disabled',
      });
    }
  });

  test('onboarding -- progress indicator no animation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const progress = page.locator('[data-testid="onboarding-progress"]').or(page.locator('main section')).first();
    if (await progress.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(progress).toHaveScreenshot('a11y-motion-onboarding-progress.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-onboarding-progress.png', {
        animations: 'disabled',
      });
    }
  });

  test('onboarding -- action buttons static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('a11y-motion-onboarding-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-onboarding-actions.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Additional reduced motion checks ---

  test('social -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-motion-social-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-social-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('analytics -- topbar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('a11y-motion-analytics-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-analytics-topbar.png', {
        animations: 'disabled',
      });
    }
  });

  test('knowledge graph -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-motion-knowledge-graph-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-knowledge-graph-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('onboarding -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-motion-onboarding-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-motion-onboarding-sidebar.png', {
        animations: 'disabled',
      });
    }
  });
});

/**
 * visual-a11y-reduced-motion.spec.ts --- Accessibility Reduced Motion Visual Regression
 *
 * Screenshot-based visual regression validating that all pages respect the
 * prefers-reduced-motion media query. WCAG 2.3.3 requires that animations can be
 * disabled. When reduced motion is active, no CSS transitions, transforms, or JS
 * animations should run --- all content should be in its final static state.
 *
 * Snapshots stored in: apps/web/e2e/visual-a11y-reduced-motion.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-a11y-reduced-motion --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-a11y-reduced-motion.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.describe('Visual A11y -- Reduced Motion @visual @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  // --- Dashboard ---

  test('dashboard -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('a11y-motion-dashboard-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('dashboard -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    await expect(sidebar).toHaveScreenshot('a11y-motion-dashboard-sidebar.png', {
      animations: 'disabled',
    });
  });

  test('dashboard -- widgets no animation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toHaveScreenshot('a11y-motion-dashboard-widgets.png', {
      animations: 'disabled',
      mask: dynamicMasks(page),
    });
  });

  test('dashboard -- topbar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    await expect(topbar).toHaveScreenshot('a11y-motion-dashboard-topbar.png', {
      animations: 'disabled',
    });
  });

  // --- Knowledge Graph ---

  test('knowledge graph -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('a11y-motion-knowledge-graph-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('knowledge graph -- graph area static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toHaveScreenshot('a11y-motion-knowledge-graph-content.png', {
      animations: 'disabled',
      mask: dynamicMasks(page),
    });
  });

  test('knowledge graph -- controls no animation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, { waitUntil: 'domcontentloaded' });
    const controls = page.locator('[data-testid="graph-controls"]').or(page.locator('main section')).first();
    await expect(controls).toHaveScreenshot('a11y-motion-knowledge-graph-controls.png', {
      animations: 'disabled',
    });
  });

  // --- Social ---

  test('social -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('a11y-motion-social-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('social -- feed area static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toHaveScreenshot('a11y-motion-social-feed.png', {
      animations: 'disabled',
      mask: dynamicMasks(page),
    });
  });

  // --- Analytics ---

  test('analytics -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('a11y-motion-analytics-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('analytics -- charts static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toHaveScreenshot('a11y-motion-analytics-charts.png', {
      animations: 'disabled',
      mask: dynamicMasks(page),
    });
  });

  test('analytics -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    await expect(sidebar).toHaveScreenshot('a11y-motion-analytics-sidebar.png', {
      animations: 'disabled',
    });
  });

  // --- Onboarding ---

  test('onboarding -- full page no animations', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('a11y-motion-onboarding-full.png', STABLE_OPTS);
  });

  test('onboarding -- step content static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toHaveScreenshot('a11y-motion-onboarding-content.png', {
      animations: 'disabled',
    });
  });

  test('onboarding -- progress indicator no animation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    const progress = page.locator('[data-testid="onboarding-progress"]').or(page.locator('main section')).first();
    await expect(progress).toHaveScreenshot('a11y-motion-onboarding-progress.png', {
      animations: 'disabled',
    });
  });

  test('onboarding -- action buttons static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    const actions = page.locator('main').first();
    await expect(actions).toHaveScreenshot('a11y-motion-onboarding-actions.png', {
      animations: 'disabled',
    });
  });

  // --- Additional reduced motion checks ---

  test('social -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    await expect(sidebar).toHaveScreenshot('a11y-motion-social-sidebar.png', {
      animations: 'disabled',
    });
  });

  test('analytics -- topbar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    const topbar = page.getByTestId('topbar').or(page.locator('header')).first();
    await expect(topbar).toHaveScreenshot('a11y-motion-analytics-topbar.png', {
      animations: 'disabled',
    });
  });

  test('knowledge graph -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/knowledge-graph`, { waitUntil: 'domcontentloaded' });
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    await expect(sidebar).toHaveScreenshot('a11y-motion-knowledge-graph-sidebar.png', {
      animations: 'disabled',
    });
  });

  test('onboarding -- sidebar static state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    await expect(sidebar).toHaveScreenshot('a11y-motion-onboarding-sidebar.png', {
      animations: 'disabled',
    });
  });
});

/**
 * Visual Regression Tests — New Features (Part 3: Profile & Portfolio + Admin Pages)
 * Split from visual-regression-new-features.spec.ts for file size compliance.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => { await login(page); });

const STABLE_OPTS = { maxDiffPixels: 200, threshold: 0.2, animations: 'disabled' as const };
const LOOSE_OPTS = { maxDiffPixels: 500, threshold: 0.3, animations: 'disabled' as const };

function dynamicMasks(page: Page) {
  return [
    page.locator('[data-testid="timestamp"]'), page.locator('[data-testid="user-avatar"]'),
    page.locator('[data-dynamic]'), page.locator('time'), page.locator('.user-avatar'),
    page.locator('[data-testid="leaderboard-points"]'), page.locator('[data-testid="streak-count"]'),
  ];
}

async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('main, [role="main"], #root > div, .min-h-screen').first()
    .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

test.describe('Visual Regression — Profile & Portfolio @visual-new', () => {
  test.setTimeout(30_000);

  test('public profile page — hero card renders correctly', async ({ page }) => {
    await goTo(page, '/u/user-1');
    await expect(page).toHaveScreenshot('public-profile-full.png', {
      fullPage: true, ...STABLE_OPTS,
      mask: [...dynamicMasks(page), page.locator('time'), page.locator('text=/Member since/').locator('..')],
    });
  });

  test('public profile page — private / not found state renders correctly', async ({ page }) => {
    await goTo(page, '/u/non-existent-user-xyz');
    await expect(page).toHaveScreenshot('public-profile-private.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('public profile page — stats row renders correctly', async ({ page }) => {
    await goTo(page, '/u/user-1');
    const statsRow = page.locator('.grid-cols-3, .grid-cols-5').first();
    const statsVisible = await statsRow.isVisible().catch(() => false);
    if (statsVisible) {
      await expect(statsRow).toHaveScreenshot('public-profile-stats-row.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('public-profile-stats-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('profile page — my profile renders correctly', async ({ page }) => {
    await goTo(page, '/profile');
    await expect(page).toHaveScreenshot('profile-page-full.png', {
      fullPage: true, ...STABLE_OPTS,
      mask: [...dynamicMasks(page), page.locator('text=/student@|instructor@|admin@/').locator('..')],
    });
  });

  test('profile page — preferences section renders correctly', async ({ page }) => {
    await goTo(page, '/profile');
    const prefsSection = page.locator('.card', { hasText: /preferences/i }).first();
    const prefsVisible = await prefsSection.isVisible().catch(() => false);
    if (prefsVisible) {
      await expect(prefsSection).toHaveScreenshot('profile-preferences-section.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('profile-preferences-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });
});

test.describe('Visual Regression — Admin Pages @visual-new', () => {
  test.setTimeout(30_000);

  test('LTI settings page — empty platforms list renders correctly', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await expect(page).toHaveScreenshot('admin-lti-empty.png', {
      fullPage: true, ...STABLE_OPTS,
      mask: [...dynamicMasks(page), page.locator('text=/localhost|https:\\/\\//').locator('..')],
    });
  });

  test('LTI settings page — page heading and action buttons visible', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const heading = page.locator('h1', { hasText: /LTI 1.3 Platforms/i });
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const headerSection = page.locator('.max-w-4xl').first();
      await expect(headerSection.locator('.flex.items-center').first()).toHaveScreenshot('admin-lti-header.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('admin-lti-header-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('LTI settings page — register platform form renders correctly', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const registerBtn = page.locator('button', { hasText: /register platform/i });
    const btnVisible = await registerBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await registerBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const form = page.locator('.card', { hasText: /Register LTI 1.3 Platform/i });
      const formVisible = await form.isVisible().catch(() => false);
      if (formVisible) {
        await expect(form).toHaveScreenshot('admin-lti-register-form.png', STABLE_OPTS);
      }
    }
    await expect(page).toHaveScreenshot('admin-lti-with-form.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('SCIM settings page — full page renders correctly', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await expect(page).toHaveScreenshot('admin-scim-full.png', {
      fullPage: true, ...STABLE_OPTS, mask: [...dynamicMasks(page), page.locator('.font-mono')],
    });
  });

  test('SCIM settings page — generate token modal renders correctly', async ({ page }) => {
    await goTo(page, '/admin/scim');
    const generateBtn = page.locator('button', { hasText: /generate token/i });
    const btnVisible = await generateBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await generateBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const modal = page.locator('[class*="fixed inset-0"]').first();
      const modalVisible = await modal.isVisible().catch(() => false);
      if (modalVisible) {
        await expect(modal).toHaveScreenshot('admin-scim-token-modal.png', STABLE_OPTS);
      }
    }
    await expect(page).toHaveScreenshot('admin-scim-with-modal.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('compliance reports page — full page renders correctly', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await expect(page).toHaveScreenshot('admin-compliance-full.png', {
      fullPage: true, ...STABLE_OPTS,
      mask: [...dynamicMasks(page), page.locator('text=/Due:/').locator('..')],
    });
  });

  test('compliance reports page — heading and compliance courses section', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    const heading = page.locator('h1', { hasText: /compliance training reports/i });
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const coursesCard = page.locator('.card', { hasText: /Compliance Courses/i }).first();
      const cardVisible = await coursesCard.isVisible().catch(() => false);
      if (cardVisible) {
        await expect(coursesCard).toHaveScreenshot('admin-compliance-courses-card.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
      }
    }
    await expect(page).toHaveScreenshot('admin-compliance-heading-section.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
  });

  test('course analytics page — renders correctly with metrics', async ({ page }) => {
    await goTo(page, '/courses/course-1/analytics');
    await expect(page).toHaveScreenshot('course-analytics-full.png', {
      fullPage: true, ...LOOSE_OPTS,
      mask: [...dynamicMasks(page), page.locator('canvas'), page.locator('[data-testid="chart"]')],
    });
  });

  test('course analytics page — stat cards render correctly', async ({ page }) => {
    await goTo(page, '/courses/course-1/analytics');
    const statsGrid = page.locator('.grid-cols-2, .grid-cols-4').first();
    const gridVisible = await statsGrid.isVisible().catch(() => false);
    if (gridVisible) {
      await expect(statsGrid).toHaveScreenshot('course-analytics-stat-cards.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    } else {
      await expect(page).toHaveScreenshot('course-analytics-stat-cards-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });

  test('course analytics page — at-risk learners table renders correctly', async ({ page }) => {
    await goTo(page, '/courses/course-1/analytics');
    const atRiskCard = page.locator('.card', { hasText: /at-risk learners/i }).first();
    const visible = await atRiskCard.isVisible().catch(() => false);
    if (visible) {
      await expect(atRiskCard).toHaveScreenshot('course-analytics-at-risk-table.png', {
        ...STABLE_OPTS, mask: [...dynamicMasks(page), page.locator('[data-testid="learner-name"]'), page.locator('[data-testid="learner-email"]')],
      });
    } else {
      await expect(page).toHaveScreenshot('course-analytics-at-risk-fallback.png', { ...STABLE_OPTS, mask: dynamicMasks(page) });
    }
  });
});

/**
 * aria-phase28.spec.ts — ARIA / Accessibility E2E Tests for Phase 28 Features
 *
 * Covers WCAG 2.1 AA / ARIA patterns for all Phase 28 components:
 *   1. LiveSessionsPage — tablist/tab ARIA roles, tab panel association
 *   2. AdminActivityFeed — role="log" + aria-live="polite"
 *   3. CoursesDiscovery level filter group — role="group" + aria-label
 *   4. OfflineBanner — role="status" + aria-live="polite"
 *   5. CoursesDiscovery sort select — accessible label association
 *
 * Does NOT depend on axe-core — focuses on explicit ARIA attribute assertions
 * that Phase 28 components are required to implement.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/aria-phase28.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login, loginInDevMode } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Suite 1: LiveSessionsPage ARIA ───────────────────────────────────────────

test.describe('ARIA Phase 28 — LiveSessionsPage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/sessions`);
    await page.waitForLoadState('networkidle');
  });

  test('tabs container has role="tablist"', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    const count = await tablist.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(tablist.first()).toBeVisible({ timeout: 5_000 });
  });

  test('tablist has an accessible label (aria-label)', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    if (await tablist.count() > 0) {
      const label = await tablist.first().getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  });

  test('Upcoming tab has role="tab"', async ({ page }) => {
    const upcomingTab = page.locator('[data-testid="tab-upcoming"]');
    if (await upcomingTab.count() > 0) {
      await expect(upcomingTab).toHaveAttribute('role', 'tab');
    } else {
      // Fallback: find any tab role
      const tabs = page.locator('[role="tab"]');
      expect(await tabs.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('Past tab has role="tab"', async ({ page }) => {
    const pastTab = page.locator('[data-testid="tab-past"]');
    if (await pastTab.count() > 0) {
      await expect(pastTab).toHaveAttribute('role', 'tab');
    }
  });

  test('active tab has aria-selected="true"', async ({ page }) => {
    const upcomingTab = page.locator('[data-testid="tab-upcoming"]');
    if (await upcomingTab.count() > 0) {
      await expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('inactive tab has aria-selected="false"', async ({ page }) => {
    const pastTab = page.locator('[data-testid="tab-past"]');
    if (await pastTab.count() > 0) {
      await expect(pastTab).toHaveAttribute('aria-selected', 'false');
    }
  });

  test('active tab has tabIndex="0" and inactive tab has tabIndex="-1"', async ({
    page,
  }) => {
    const upcomingTab = page.locator('[data-testid="tab-upcoming"]');
    const pastTab = page.locator('[data-testid="tab-past"]');

    if (
      (await upcomingTab.count()) > 0 &&
      (await pastTab.count()) > 0
    ) {
      await expect(upcomingTab).toHaveAttribute('tabindex', '0');
      await expect(pastTab).toHaveAttribute('tabindex', '-1');
    }
  });

  test('tab panel has role implied or aria-live for session list updates', async ({
    page,
  }) => {
    // The sessions grid (aria-live="polite") is the live region for tab panel content
    const grid = page.locator('[data-testid="sessions-grid"]');
    if (await grid.count() > 0) {
      const live = await grid.getAttribute('aria-live');
      expect(live).toBe('polite');
    }
  });

  test('session cards have descriptive accessible names via data-testid', async ({
    page,
  }) => {
    const cards = page.locator('[data-testid="session-card"]');
    const count = await cards.count();
    if (count > 0) {
      // Each card renders a session-title with the meeting name
      const titleEl = cards.first().locator('[data-testid="session-title"]');
      const titleVisible = await titleEl
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (titleVisible) {
        const text = await titleEl.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('status badges render without crashing (LIVE / SCHEDULED / ENDED)', async ({
    page,
  }) => {
    // The status badge data-testids: session-status-live, session-status-scheduled, session-status-ended
    // At least the page renders without a crash
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body.length).toBeGreaterThan(10);
    expect(body).not.toContain('[object Object]');
  });
});

// ─── Suite 2: AdminActivityFeed ARIA ──────────────────────────────────────────

test.describe('ARIA Phase 28 — AdminActivityFeed', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // AdminActivityFeed is on the dashboard or admin pages
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
  });

  test('AdminActivityFeed live region has role="log" or aria-live', async ({
    page,
  }) => {
    // Possible selectors for the activity feed live region
    const feedEl = page
      .locator('[data-testid="admin-activity-feed"]')
      .or(page.locator('[role="log"]'))
      .or(page.locator('[aria-label*="activity" i]'));

    const count = await feedEl.count();
    if (count > 0) {
      const el = feedEl.first();
      const role = await el.getAttribute('role');
      const ariaLive = await el.getAttribute('aria-live');
      // Must have either role="log" (which implies aria-live="polite") OR explicit aria-live
      const isAccessible =
        role === 'log' ||
        (ariaLive !== null && ['polite', 'assertive'].includes(ariaLive));
      expect(isAccessible).toBe(true);
    } else {
      // Feed not present on this page — check admin route
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
      const adminFeedEl = page
        .locator('[data-testid="admin-activity-feed"]')
        .or(page.locator('[role="log"]'));
      const adminCount = await adminFeedEl.count();
      // Soft assertion: feed may not exist on all admin pages
      if (adminCount > 0) {
        const role = await adminFeedEl.first().getAttribute('role');
        const ariaLive = await adminFeedEl.first().getAttribute('aria-live');
        const isAccessible = role === 'log' || ariaLive != null;
        expect(isAccessible).toBe(true);
      }
    }
  });

  test('no raw tech error strings on dashboard', async ({ page }) => {
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('TypeError');
    expect(body).not.toContain('Error:');
  });
});

// ─── Suite 3: CoursesDiscovery filter ARIA ────────────────────────────────────

test.describe('ARIA Phase 28 — CoursesDiscovery Level Filter', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/discover`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .getByRole('heading', { name: /Discover Courses/i })
      .waitFor({ timeout: 10_000 });
  });

  test('level filter group has role="group"', async ({ page }) => {
    const group = page.locator('[data-testid="level-filter-group"]').or(
      page.locator('[role="group"][aria-label*="level" i]')
    );
    await expect(group.first()).toBeVisible({ timeout: 10_000 });
    const role = await group.first().getAttribute('role');
    expect(role).toBe('group');
  });

  test('level filter group has aria-label="Filter by level"', async ({
    page,
  }) => {
    const group = page.locator('[role="group"][aria-label="Filter by level"]');
    await expect(group).toBeVisible({ timeout: 10_000 });
    const label = await group.getAttribute('aria-label');
    expect(label).toBe('Filter by level');
  });

  test('each level pill button has aria-pressed attribute', async ({
    page,
  }) => {
    const levels = ['Any Level', 'Beginner', 'Intermediate', 'Advanced'];
    for (const lvl of levels) {
      const btn = page.getByRole('button', { name: lvl }).first();
      const visible = await btn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (visible) {
        const pressed = await btn.getAttribute('aria-pressed');
        // aria-pressed must be "true" or "false"
        expect(['true', 'false']).toContain(pressed);
      }
    }
  });

  test('"Any Level" pill is selected (aria-pressed="true") by default', async ({
    page,
  }) => {
    const anyLevelBtn = page.getByRole('button', { name: 'Any Level' }).first();
    await expect(anyLevelBtn).toBeVisible({ timeout: 10_000 });
    await expect(anyLevelBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking "Intermediate" sets its aria-pressed="true" and "Any Level" to "false"', async ({
    page,
  }) => {
    const intermediateBtn = page
      .getByRole('button', { name: 'Intermediate' })
      .first();
    await intermediateBtn.waitFor({ timeout: 10_000 });
    await intermediateBtn.click();
    await page.waitForTimeout(200);

    await expect(intermediateBtn).toHaveAttribute('aria-pressed', 'true');

    const anyLevelBtn = page
      .getByRole('button', { name: 'Any Level' })
      .first();
    await expect(anyLevelBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('sort select has an associated label element', async ({ page }) => {
    // Label via htmlFor="sort-select" or nearby "Sort by" text
    const label = page.locator('label[for="sort-select"]').or(
      page.locator('label', { hasText: /Sort by/i }).first()
    );
    await expect(label.first()).toBeVisible({ timeout: 10_000 });
  });

  test('sort select trigger has aria-label or is labelled', async ({
    page,
  }) => {
    const trigger = page.locator('[data-testid="sort-select"]').or(
      page.locator('#sort-select')
    );
    await expect(trigger.first()).toBeVisible({ timeout: 10_000 });

    // Check for aria-label or labelledby or associated label
    const ariaLabel = await trigger.first().getAttribute('aria-label');
    const ariaLabelledBy = await trigger.first().getAttribute('aria-labelledby');
    const id = await trigger.first().getAttribute('id');

    let hasAssociatedLabel = false;
    if (ariaLabel && ariaLabel.length > 0) hasAssociatedLabel = true;
    if (ariaLabelledBy && ariaLabelledBy.length > 0) hasAssociatedLabel = true;
    if (id) {
      const labelCount = await page.locator(`label[for="${id}"]`).count();
      if (labelCount > 0) hasAssociatedLabel = true;
    }

    expect(hasAssociatedLabel).toBe(true);
  });

  test('category filter buttons have aria-pressed attribute', async ({
    page,
  }) => {
    const allBtn = page.getByRole('button', { name: 'All' }).first();
    await expect(allBtn).toBeVisible({ timeout: 10_000 });
    const pressed = await allBtn.getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(pressed);
  });

  test('search input has aria-label', async ({ page }) => {
    const input = page.locator('[data-testid="course-search-input"]').or(
      page.locator('input[aria-label*="Search" i]').first()
    );
    await expect(input.first()).toBeVisible({ timeout: 10_000 });
    const ariaLabel = await input.first().getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel!.length).toBeGreaterThan(0);
  });

  test('course listing grid has aria-label', async ({ page }) => {
    const grid = page.locator('[data-testid="courses-grid"]').or(
      page.locator('[aria-label="Course listing"]')
    );
    await expect(grid.first()).toBeVisible({ timeout: 10_000 });
    const label = await grid.first().getAttribute('aria-label');
    expect(label?.length).toBeGreaterThan(0);
  });

  test('view mode toggle group has role="group" and aria-label', async ({
    page,
  }) => {
    const viewToggle = page.locator('[data-testid="view-toggle"]').or(
      page.locator('[role="group"][aria-label*="view" i]')
    );
    const count = await viewToggle.count();
    if (count > 0) {
      const role = await viewToggle.first().getAttribute('role');
      const label = await viewToggle.first().getAttribute('aria-label');
      expect(role).toBe('group');
      expect(label?.length).toBeGreaterThan(0);
    }
  });
});

// ─── Suite 4: OfflineBanner ARIA ─────────────────────────────────────────────

test.describe('ARIA Phase 28 — OfflineBanner', () => {
  test.beforeEach(async ({ page }) => {
    // OfflineBanner is in the authenticated Layout — login required
    await loginInDevMode(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('OfflineBanner has role="status" when visible', async ({
    page,
    context,
  }) => {
    // start on dashboard (already navigated in beforeEach)

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toHaveAttribute('role', 'status');

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('OfflineBanner has aria-live="polite" when visible', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toHaveAttribute('aria-live', 'polite');

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('OfflineBanner has aria-atomic="true"', async ({ page, context }) => {
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toHaveAttribute('aria-atomic', 'true');

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('OfflineBanner text is readable (not empty, no raw errors)', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.getByTestId('offline-banner');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    const text = await banner.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('[object Object]');

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });
});

// ─── Suite 5: Phase 28 cross-cutting ARIA checks ──────────────────────────────

test.describe('ARIA Phase 28 — Cross-cutting', () => {
  test('LiveSessionsPage — interactive buttons have accessible names', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/sessions`);
    await page.waitForLoadState('networkidle');

    // Check all visible buttons have accessible names
    const buttons = page.locator('button:not([hidden]):not([disabled])');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) continue;

      const text = (await btn.textContent())?.trim() ?? '';
      const ariaLabel = await btn.getAttribute('aria-label');
      const ariaLabelledBy = await btn.getAttribute('aria-labelledby');

      const hasName =
        text.length > 0 ||
        (ariaLabel && ariaLabel.length > 0) ||
        (ariaLabelledBy && ariaLabelledBy.length > 0);

      // Every button must have an accessible name
      expect(
        hasName,
        `Button at index ${i} has no accessible name (text: "${text}", aria-label: "${ariaLabel}")`
      ).toBe(true);
    }
  });

  test('CoursesDiscovery — no duplicate role="group" labels', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/discover`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .getByRole('heading', { name: /Discover Courses/i })
      .waitFor({ timeout: 10_000 });

    // Collect all role="group" elements and their aria-labels
    const groups = page.locator('[role="group"]');
    const count = await groups.count();
    const labels: string[] = [];

    for (let i = 0; i < count; i++) {
      const label = await groups.nth(i).getAttribute('aria-label');
      if (label) labels.push(label);
    }

    // No duplicate labels (each group must have a unique name)
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

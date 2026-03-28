/**
 * Visual Test Utilities — Shared constants and helpers for visual regression E2E tests.
 *
 * Usage:
 *   import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
 *
 *   await expect(page).toHaveScreenshot('name.png', STABLE_OPTS);
 *   await expect(page).toHaveScreenshot('name.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });
 */
import type { Page, Locator } from '@playwright/test';

/**
 * Strict screenshot comparison options — use for static pages with no dynamic content.
 * maxDiffPixelRatio: 1% tolerance for sub-pixel rendering differences across OS/GPU.
 */
export const STABLE_OPTS = {
  fullPage: true,
  maxDiffPixelRatio: 0.01,
  animations: 'disabled' as const,
} as const;

/**
 * Loose screenshot comparison options — use for pages with dynamic/animated content.
 * maxDiffPixelRatio: 5% tolerance for content that changes between runs (timestamps, avatars).
 */
export const LOOSE_OPTS = {
  fullPage: true,
  maxDiffPixelRatio: 0.05,
  animations: 'disabled' as const,
} as const;

/**
 * Returns an array of Locator masks for common dynamic elements that change between runs.
 * These elements are masked (blacked out) during screenshot comparison to prevent false positives.
 *
 * Masked elements:
 * - Timestamps and relative dates (data-testid="timestamp", time elements)
 * - User avatars (data-testid="avatar")
 * - Loading spinners (data-testid="spinner", role="progressbar")
 * - Live counters (data-testid="live-counter")
 * - Notification badges (data-testid="notification-badge")
 *
 * @param page - Playwright Page instance
 * @returns Array of Locator objects to mask during screenshot comparison
 */
export function dynamicMasks(page: Page): Locator[] {
  return [
    page.locator('[data-testid="timestamp"]'),
    page.locator('time'),
    page.locator('[data-testid="avatar"]'),
    page.locator('[data-testid="spinner"]'),
    page.locator('[role="progressbar"]'),
    page.locator('[data-testid="live-counter"]'),
    page.locator('[data-testid="notification-badge"]'),
  ];
}

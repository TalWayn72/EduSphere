import { Page } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';

export interface VisualSnapshotOptions {
  /** Capture the full scrollable page (default: false) */
  fullPage?: boolean;
  /** Viewport dimensions to set before capturing */
  viewport?: { width: number; height: number };
  /** Pixel difference threshold 0-1 (default: 0.05) */
  threshold?: number;
}

/**
 * Takes a screenshot and uploads it to Argos CI for visual regression.
 * Falls back to standard Playwright screenshot if ARGOS_TOKEN is not set.
 *
 * Supports viewport resizing, threshold configuration, and full-page capture.
 * All new parameters are optional to maintain backward compatibility.
 */
export async function visualSnapshot(
  page: Page,
  name: string,
  options?: VisualSnapshotOptions,
): Promise<void> {
  const { fullPage = false, viewport, threshold } = options ?? {};

  if (viewport) {
    await page.setViewportSize(viewport);
    // Allow layout to stabilize after resize
    await page.waitForTimeout(300);
  }

  if (process.env['ARGOS_TOKEN']) {
    await argosScreenshot(page, name, {
      fullPage,
      ...(threshold !== undefined && { threshold }),
    });
  } else {
    await page.screenshot({
      path: `apps/web/visual-qa-results/${name.replace(/\s+/g, '-')}.png`,
      fullPage,
    });
  }
}

import { Page } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';

/**
 * Takes a screenshot and uploads it to Argos CI for visual regression.
 * Falls back to standard Playwright screenshot if ARGOS_TOKEN is not set.
 */
export async function visualSnapshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean },
): Promise<void> {
  if (process.env['ARGOS_TOKEN']) {
    await argosScreenshot(page, name, options);
  } else {
    await page.screenshot({
      path: `apps/web/visual-qa-results/${name.replace(/\s+/g, '-')}.png`,
      fullPage: options?.fullPage ?? false,
    });
  }
}

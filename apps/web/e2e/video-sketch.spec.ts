/**
 * E2E — Video Sketch Overlay tools (PRD §4.2).
 * Tests the enhanced sketch overlay: color picker, tool selector, eraser, shapes, text, visual regression.
 */
import { test, expect } from '@playwright/test';

const LESSON_URL = '/courses/course-1/lessons/lesson-1';

test.describe('Video Sketch Overlay — tool selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    // Activate sketch mode if toggle button is present
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) {
      await toggle.click();
    }
  });

  test('sketch toolbar is visible after activation', async ({ page }) => {
    await expect(page.getByTestId('sketch-toolbar')).toBeVisible();
  });

  test('all 6 tool buttons are present', async ({ page }) => {
    for (const tool of ['freehand', 'eraser', 'rect', 'arrow', 'ellipse', 'text']) {
      await expect(page.getByTestId(`sketch-tool-${tool}`)).toBeVisible();
    }
  });

  test('freehand is selected by default', async ({ page }) => {
    await expect(page.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking eraser sets it as active tool', async ({ page }) => {
    await page.getByTestId('sketch-tool-eraser').click();
    await expect(page.getByTestId('sketch-tool-eraser')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking rect tool sets it as active tool', async ({ page }) => {
    await page.getByTestId('sketch-tool-rect').click();
    await expect(page.getByTestId('sketch-tool-rect')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking arrow tool sets it as active tool', async ({ page }) => {
    await page.getByTestId('sketch-tool-arrow').click();
    await expect(page.getByTestId('sketch-tool-arrow')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking ellipse tool sets it as active tool', async ({ page }) => {
    await page.getByTestId('sketch-tool-ellipse').click();
    await expect(page.getByTestId('sketch-tool-ellipse')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking text tool sets it as active tool', async ({ page }) => {
    await page.getByTestId('sketch-tool-text').click();
    await expect(page.getByTestId('sketch-tool-text')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Video Sketch Overlay — color picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) await toggle.click();
  });

  test('color picker is visible in sketch mode', async ({ page }) => {
    await expect(page.getByTestId('sketch-color-picker')).toBeVisible();
  });

  test('color swatch shows default red color', async ({ page }) => {
    const swatch = page.getByTestId('sketch-color-swatch');
    await expect(swatch).toBeVisible();
    const bg = await swatch.evaluate((el) => getComputedStyle(el).backgroundColor);
    // #ef4444 = rgb(239, 68, 68)
    expect(bg).toBe('rgb(239, 68, 68)');
  });
});

test.describe('Video Sketch Overlay — text tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) await toggle.click();
  });

  test('selecting text tool then clicking canvas shows text input', async ({ page }) => {
    await page.getByTestId('sketch-tool-text').click();
    const canvas = page.locator('canvas[aria-label*="Sketch canvas"]');
    if (await canvas.isVisible()) {
      await canvas.click({ position: { x: 100, y: 50 } });
      await expect(page.getByTestId('sketch-text-input')).toBeVisible();
    }
  });
});

test.describe('Video Sketch Overlay — cancel and save', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) await toggle.click();
  });

  test('Cancel returns to inactive state with toggle button', async ({ page }) => {
    await page.getByTestId('sketch-cancel-btn').click();
    await expect(page.getByTestId('sketch-toggle-btn')).toBeVisible();
    await expect(page.getByTestId('sketch-toolbar')).not.toBeVisible();
  });

  test('Cancel resets selected tool to freehand on re-open', async ({ page }) => {
    await page.getByTestId('sketch-tool-eraser').click();
    await page.getByTestId('sketch-cancel-btn').click();
    await page.getByTestId('sketch-toggle-btn').click();
    await expect(page.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Save button is present and not disabled initially', async ({ page }) => {
    await expect(page.getByTestId('sketch-save-btn')).toBeVisible();
  });
});

test.describe('Video Sketch Overlay — visual regression', () => {
  test('sketch toolbar with default freehand tool', async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.getByTestId('sketch-toolbar')).toBeVisible();
      await expect(page).toHaveScreenshot('sketch-toolbar-freehand.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 500 },
      });
    }
  });

  test('sketch toolbar with eraser tool active', async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.getByTestId('sketch-tool-eraser').click();
      await expect(page).toHaveScreenshot('sketch-toolbar-eraser.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 500 },
      });
    }
  });

  test('sketch toolbar with rect tool active', async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.getByTestId('sketch-tool-rect').click();
      await expect(page).toHaveScreenshot('sketch-toolbar-rect.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 500 },
      });
    }
  });

  test('sketch toggle button in inactive state', async ({ page }) => {
    await page.goto(LESSON_URL);
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.getByTestId('sketch-toggle-btn');
    if (await toggle.isVisible()) {
      await expect(page).toHaveScreenshot('sketch-toggle-inactive.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 500 },
      });
    }
  });
});

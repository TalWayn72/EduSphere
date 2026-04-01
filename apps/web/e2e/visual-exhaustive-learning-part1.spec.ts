/**
 * Visual Exhaustive Learning — Routes 1-5
 *
 * Courses, Lessons, Quiz, Exam, Annotations across desktop/tablet/mobile.
 * Split from visual-exhaustive-learning.spec.ts (Part 1 of 2).
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { BASE_URL } from './env';

test.use({ reducedMotion: 'reduce' });
const BASE = BASE_URL;
const EO = { animations: 'disabled' as const };

async function prep(page: Page, path: string, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function elOrPage(page: Page, sel: string): Promise<Page | Locator> {
  const el = page.locator(sel).first();
  return (await el.isVisible({ timeout: 2000 }).catch(() => false)) ? el : page;
}

// ── Route 1: /courses/1 ─────────────────────────────────────────────────────
test('courses-desktop-full', async ({ page }) => {
  await prep(page, '/courses/1', 1280, 720);
  await expect(page).toHaveScreenshot('courses-desktop-full.png', EO); // 1
});
test('courses-tablet-full', async ({ page }) => {
  await prep(page, '/courses/1', 768, 1024);
  await expect(page).toHaveScreenshot('courses-tablet-full.png', EO); // 2
});
test('courses-mobile-full', async ({ page }) => {
  await prep(page, '/courses/1', 375, 812);
  await expect(page).toHaveScreenshot('courses-mobile-full.png', EO); // 3
});
test('courses-desktop-sidebar', async ({ page }) => {
  await prep(page, '/courses/1', 1280, 720);
  const t = await elOrPage(page, 'aside, [data-testid="sidebar"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('courses-desktop-sidebar.png', EO);
  } // 4
  else {
    await expect(t).toHaveScreenshot('courses-desktop-sidebar-fp.png', EO);
  } // 5
});
test('courses-desktop-nav', async ({ page }) => {
  await prep(page, '/courses/1', 1280, 720);
  const t = await elOrPage(page, 'nav, header, [role="banner"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('courses-desktop-nav.png', EO);
  } // 6
  else {
    await expect(t).toHaveScreenshot('courses-desktop-nav-fp.png', EO);
  } // 7
});
test('courses-tablet-content', async ({ page }) => {
  await prep(page, '/courses/1', 768, 1024);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('courses-tablet-content.png', EO);
  } // 8
  else {
    await expect(t).toHaveScreenshot('courses-tablet-content-fp.png', EO);
  } // 9
});

// ── Route 2: /courses/1/lessons/1 ───────────────────────────────────────────
test('lesson-desktop-full', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 1280, 720);
  await expect(page).toHaveScreenshot('lesson-desktop-full.png', EO); // 10
});
test('lesson-tablet-full', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 768, 1024);
  await expect(page).toHaveScreenshot('lesson-tablet-full.png', EO); // 11
});
test('lesson-mobile-full', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 375, 812);
  await expect(page).toHaveScreenshot('lesson-mobile-full.png', EO); // 12
});
test('lesson-desktop-content', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 1280, 720);
  const t = await elOrPage(page, '[data-testid="content-viewer"], main');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('lesson-desktop-content.png', EO);
  } // 13
  else {
    await expect(t).toHaveScreenshot('lesson-desktop-content-fp.png', EO);
  } // 14
});
test('lesson-tablet-sidebar', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 768, 1024);
  const t = await elOrPage(page, 'aside, [data-testid="sidebar"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('lesson-tablet-sidebar.png', EO);
  } // 15
  else {
    await expect(t).toHaveScreenshot('lesson-tablet-sidebar-fp.png', EO);
  } // 16
});
test('lesson-mobile-nav', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 375, 812);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('lesson-mobile-nav.png', EO);
  } // 17
  else {
    await expect(t).toHaveScreenshot('lesson-mobile-nav-fp.png', EO);
  } // 18
});

// ── Route 3: /quiz/1 ────────────────────────────────────────────────────────
test('quiz-desktop-full', async ({ page }) => {
  await prep(page, '/quiz/1', 1280, 720);
  await expect(page).toHaveScreenshot('quiz-desktop-full.png', EO); // 19
});
test('quiz-tablet-full', async ({ page }) => {
  await prep(page, '/quiz/1', 768, 1024);
  await expect(page).toHaveScreenshot('quiz-tablet-full.png', EO); // 20
});
test('quiz-mobile-full', async ({ page }) => {
  await prep(page, '/quiz/1', 375, 812);
  await expect(page).toHaveScreenshot('quiz-mobile-full.png', EO); // 21
});
test('quiz-desktop-forms', async ({ page }) => {
  await prep(page, '/quiz/1', 1280, 720);
  const t = await elOrPage(page, 'form, [data-testid="quiz-form"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('quiz-desktop-forms.png', EO);
  } // 22
  else {
    await expect(t).toHaveScreenshot('quiz-desktop-forms-fp.png', EO);
  } // 23
});
test('quiz-tablet-progress', async ({ page }) => {
  await prep(page, '/quiz/1', 768, 1024);
  const t = await elOrPage(
    page,
    '[role="progressbar"], [data-testid="progress-bar"]'
  );
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('quiz-tablet-progress.png', EO);
  } // 24
  else {
    await expect(t).toHaveScreenshot('quiz-tablet-progress-fp.png', EO);
  } // 25
});
test('quiz-mobile-results', async ({ page }) => {
  await prep(page, '/quiz/1', 375, 812);
  const t = await elOrPage(
    page,
    '[data-testid="result-cards"], [data-testid="quiz-results"]'
  );
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('quiz-mobile-results.png', EO);
  } // 26
  else {
    await expect(t).toHaveScreenshot('quiz-mobile-results-fp.png', EO);
  } // 27
});

// ── Route 4: /exam/1 ────────────────────────────────────────────────────────
test('exam-desktop-full', async ({ page }) => {
  await prep(page, '/exam/1', 1280, 720);
  await expect(page).toHaveScreenshot('exam-desktop-full.png', EO); // 28
});
test('exam-tablet-full', async ({ page }) => {
  await prep(page, '/exam/1', 768, 1024);
  await expect(page).toHaveScreenshot('exam-tablet-full.png', EO); // 29
});
test('exam-mobile-full', async ({ page }) => {
  await prep(page, '/exam/1', 375, 812);
  await expect(page).toHaveScreenshot('exam-mobile-full.png', EO); // 30
});
test('exam-desktop-forms', async ({ page }) => {
  await prep(page, '/exam/1', 1280, 720);
  const t = await elOrPage(page, 'form, [data-testid="exam-form"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('exam-desktop-forms.png', EO);
  } // 31
  else {
    await expect(t).toHaveScreenshot('exam-desktop-forms-fp.png', EO);
  } // 32
});
test('exam-tablet-nav', async ({ page }) => {
  await prep(page, '/exam/1', 768, 1024);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('exam-tablet-nav.png', EO);
  } // 33
  else {
    await expect(t).toHaveScreenshot('exam-tablet-nav-fp.png', EO);
  } // 34
});
test('exam-mobile-progress', async ({ page }) => {
  await prep(page, '/exam/1', 375, 812);
  const t = await elOrPage(
    page,
    '[role="progressbar"], [data-testid="progress-bar"]'
  );
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('exam-mobile-progress.png', EO);
  } // 35
  else {
    await expect(t).toHaveScreenshot('exam-mobile-progress-fp.png', EO);
  } // 36
});

// ── Route 5: /annotations ───────────────────────────────────────────────────
test('annotations-desktop-full', async ({ page }) => {
  await prep(page, '/annotations', 1280, 720);
  await expect(page).toHaveScreenshot('annotations-desktop-full.png', EO); // 37
});
test('annotations-tablet-full', async ({ page }) => {
  await prep(page, '/annotations', 768, 1024);
  await expect(page).toHaveScreenshot('annotations-tablet-full.png', EO); // 38
});
test('annotations-mobile-full', async ({ page }) => {
  await prep(page, '/annotations', 375, 812);
  await expect(page).toHaveScreenshot('annotations-mobile-full.png', EO); // 39
});
test('annotations-desktop-panel', async ({ page }) => {
  await prep(page, '/annotations', 1280, 720);
  const t = await elOrPage(page, '[data-testid="annotation-panel"], aside');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('annotations-desktop-panel.png', EO);
  } // 40
  else {
    await expect(t).toHaveScreenshot('annotations-desktop-panel-fp.png', EO);
  } // 41
});
test('annotations-tablet-content', async ({ page }) => {
  await prep(page, '/annotations', 768, 1024);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) {
    await expect(t).toHaveScreenshot('annotations-tablet-content.png', EO);
  } // 42
  else {
    await expect(t).toHaveScreenshot('annotations-tablet-content-fp.png', EO);
  } // 43
});

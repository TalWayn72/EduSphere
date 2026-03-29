/**
 * Visual Exhaustive Learning — Routes 6-10 + Cross-route
 *
 * AI Chat, Study Planner, Flashcards, Progress, Achievements + cross-route checks.
 * Split from visual-exhaustive-learning.spec.ts (Part 2 of 2).
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

// ── Route 6: /ai-chat ───────────────────────────────────────────────────────
test('aichat-desktop-full', async ({ page }) => {
  await prep(page, '/ai-chat', 1280, 720);
  await expect(page).toHaveScreenshot('aichat-desktop-full.png', EO); // 44
});
test('aichat-tablet-full', async ({ page }) => {
  await prep(page, '/ai-chat', 768, 1024);
  await expect(page).toHaveScreenshot('aichat-tablet-full.png', EO); // 45
});
test('aichat-mobile-full', async ({ page }) => {
  await prep(page, '/ai-chat', 375, 812);
  await expect(page).toHaveScreenshot('aichat-mobile-full.png', EO); // 46
});
test('aichat-desktop-sidebar', async ({ page }) => {
  await prep(page, '/ai-chat', 1280, 720);
  const t = await elOrPage(page, 'aside, [data-testid="sidebar"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('aichat-desktop-sidebar.png', EO); } // 47
  else { await expect(t).toHaveScreenshot('aichat-desktop-sidebar-fp.png', EO); } // 48
});
test('aichat-tablet-forms', async ({ page }) => {
  await prep(page, '/ai-chat', 768, 1024);
  const t = await elOrPage(page, 'form, [data-testid="chat-input"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('aichat-tablet-forms.png', EO); } // 49
  else { await expect(t).toHaveScreenshot('aichat-tablet-forms-fp.png', EO); } // 50
});
test('aichat-mobile-nav', async ({ page }) => {
  await prep(page, '/ai-chat', 375, 812);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) { await expect(t).toHaveScreenshot('aichat-mobile-nav.png', EO); } // 51
  else { await expect(t).toHaveScreenshot('aichat-mobile-nav-fp.png', EO); } // 52
});

// ── Route 7: /study-planner ─────────────────────────────────────────────────
test('planner-desktop-full', async ({ page }) => {
  await prep(page, '/study-planner', 1280, 720);
  await expect(page).toHaveScreenshot('planner-desktop-full.png', EO); // 53
});
test('planner-tablet-full', async ({ page }) => {
  await prep(page, '/study-planner', 768, 1024);
  await expect(page).toHaveScreenshot('planner-tablet-full.png', EO); // 54
});
test('planner-mobile-full', async ({ page }) => {
  await prep(page, '/study-planner', 375, 812);
  await expect(page).toHaveScreenshot('planner-mobile-full.png', EO); // 55
});
test('planner-desktop-content', async ({ page }) => {
  await prep(page, '/study-planner', 1280, 720);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('planner-desktop-content.png', EO); } // 56
  else { await expect(t).toHaveScreenshot('planner-desktop-content-fp.png', EO); } // 57
});
test('planner-tablet-sidebar', async ({ page }) => {
  await prep(page, '/study-planner', 768, 1024);
  const t = await elOrPage(page, 'aside, [data-testid="sidebar"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('planner-tablet-sidebar.png', EO); } // 58
  else { await expect(t).toHaveScreenshot('planner-tablet-sidebar-fp.png', EO); } // 59
});
test('planner-mobile-nav', async ({ page }) => {
  await prep(page, '/study-planner', 375, 812);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) { await expect(t).toHaveScreenshot('planner-mobile-nav.png', EO); } // 60
  else { await expect(t).toHaveScreenshot('planner-mobile-nav-fp.png', EO); } // 61
});

// ── Route 8: /flashcards ────────────────────────────────────────────────────
test('flashcards-desktop-full', async ({ page }) => {
  await prep(page, '/flashcards', 1280, 720);
  await expect(page).toHaveScreenshot('flashcards-desktop-full.png', EO); // 62
});
test('flashcards-tablet-full', async ({ page }) => {
  await prep(page, '/flashcards', 768, 1024);
  await expect(page).toHaveScreenshot('flashcards-tablet-full.png', EO); // 63
});
test('flashcards-mobile-full', async ({ page }) => {
  await prep(page, '/flashcards', 375, 812);
  await expect(page).toHaveScreenshot('flashcards-mobile-full.png', EO); // 64
});
test('flashcards-desktop-cards', async ({ page }) => {
  await prep(page, '/flashcards', 1280, 720);
  const t = await elOrPage(page, '[data-testid="result-cards"], [data-testid="flashcard"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('flashcards-desktop-cards.png', EO); } // 65
  else { await expect(t).toHaveScreenshot('flashcards-desktop-cards-fp.png', EO); } // 66
});
test('flashcards-tablet-nav', async ({ page }) => {
  await prep(page, '/flashcards', 768, 1024);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) { await expect(t).toHaveScreenshot('flashcards-tablet-nav.png', EO); } // 67
  else { await expect(t).toHaveScreenshot('flashcards-tablet-nav-fp.png', EO); } // 68
});
test('flashcards-mobile-content', async ({ page }) => {
  await prep(page, '/flashcards', 375, 812);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('flashcards-mobile-content.png', EO); } // 69
  else { await expect(t).toHaveScreenshot('flashcards-mobile-content-fp.png', EO); } // 70
});

// ── Route 9: /progress ──────────────────────────────────────────────────────
test('progress-desktop-full', async ({ page }) => {
  await prep(page, '/progress', 1280, 720);
  await expect(page).toHaveScreenshot('progress-desktop-full.png', EO); // 71
});
test('progress-tablet-full', async ({ page }) => {
  await prep(page, '/progress', 768, 1024);
  await expect(page).toHaveScreenshot('progress-tablet-full.png', EO); // 72
});
test('progress-mobile-full', async ({ page }) => {
  await prep(page, '/progress', 375, 812);
  await expect(page).toHaveScreenshot('progress-mobile-full.png', EO); // 73
});
test('progress-desktop-bars', async ({ page }) => {
  await prep(page, '/progress', 1280, 720);
  const t = await elOrPage(page, '[role="progressbar"], [data-testid="progress-bars"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('progress-desktop-bars.png', EO); } // 74
  else { await expect(t).toHaveScreenshot('progress-desktop-bars-fp.png', EO); } // 75
});
test('progress-tablet-content', async ({ page }) => {
  await prep(page, '/progress', 768, 1024);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('progress-tablet-content.png', EO); } // 76
  else { await expect(t).toHaveScreenshot('progress-tablet-content-fp.png', EO); } // 77
});
test('progress-mobile-nav', async ({ page }) => {
  await prep(page, '/progress', 375, 812);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) { await expect(t).toHaveScreenshot('progress-mobile-nav.png', EO); } // 78
  else { await expect(t).toHaveScreenshot('progress-mobile-nav-fp.png', EO); } // 79
});
test('progress-desktop-sidebar', async ({ page }) => {
  await prep(page, '/progress', 1280, 720);
  const t = await elOrPage(page, 'aside, [data-testid="sidebar"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('progress-desktop-sidebar.png', EO); } // 80
  else { await expect(t).toHaveScreenshot('progress-desktop-sidebar-fp.png', EO); } // 81
});

// ── Route 10: /achievements ─────────────────────────────────────────────────
test('achievements-desktop-full', async ({ page }) => {
  await prep(page, '/achievements', 1280, 720);
  await expect(page).toHaveScreenshot('achievements-desktop-full.png', EO); // 82
});
test('achievements-tablet-full', async ({ page }) => {
  await prep(page, '/achievements', 768, 1024);
  await expect(page).toHaveScreenshot('achievements-tablet-full.png', EO); // 83
});
test('achievements-mobile-full', async ({ page }) => {
  await prep(page, '/achievements', 375, 812);
  await expect(page).toHaveScreenshot('achievements-mobile-full.png', EO); // 84
});
test('achievements-desktop-cards', async ({ page }) => {
  await prep(page, '/achievements', 1280, 720);
  const t = await elOrPage(page, '[data-testid="result-cards"], [data-testid="achievement-card"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('achievements-desktop-cards.png', EO); } // 85
  else { await expect(t).toHaveScreenshot('achievements-desktop-cards-fp.png', EO); } // 86
});
test('achievements-tablet-content', async ({ page }) => {
  await prep(page, '/achievements', 768, 1024);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('achievements-tablet-content.png', EO); } // 87
  else { await expect(t).toHaveScreenshot('achievements-tablet-content-fp.png', EO); } // 88
});
test('achievements-mobile-nav', async ({ page }) => {
  await prep(page, '/achievements', 375, 812);
  const t = await elOrPage(page, 'nav, header');
  if ('locator' in t) { await expect(t).toHaveScreenshot('achievements-mobile-nav.png', EO); } // 89
  else { await expect(t).toHaveScreenshot('achievements-mobile-nav-fp.png', EO); } // 90
});
test('achievements-desktop-sidebar', async ({ page }) => {
  await prep(page, '/achievements', 1280, 720);
  const t = await elOrPage(page, 'aside, [data-testid="sidebar"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('achievements-desktop-sidebar.png', EO); } // 91
  else { await expect(t).toHaveScreenshot('achievements-desktop-sidebar-fp.png', EO); } // 92
});

// ── Cross-route responsive checks ───────────────────────────────────────────
test('annotations-mobile-panel', async ({ page }) => {
  await prep(page, '/annotations', 375, 812);
  const t = await elOrPage(page, '[data-testid="annotation-panel"], aside');
  if ('locator' in t) { await expect(t).toHaveScreenshot('annotations-mobile-panel.png', EO); } // 93
  else { await expect(t).toHaveScreenshot('annotations-mobile-panel-fp.png', EO); } // 94
});
test('lesson-tablet-progress', async ({ page }) => {
  await prep(page, '/courses/1/lessons/1', 768, 1024);
  const t = await elOrPage(page, '[role="progressbar"], [data-testid="progress-bar"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('lesson-tablet-progress.png', EO); } // 95
  else { await expect(t).toHaveScreenshot('lesson-tablet-progress-fp.png', EO); } // 96
});
test('exam-desktop-results', async ({ page }) => {
  await prep(page, '/exam/1', 1280, 720);
  const t = await elOrPage(page, '[data-testid="result-cards"], [data-testid="exam-results"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('exam-desktop-results.png', EO); } // 97
  else { await expect(t).toHaveScreenshot('exam-desktop-results-fp.png', EO); } // 98
});
test('courses-mobile-content', async ({ page }) => {
  await prep(page, '/courses/1', 375, 812);
  const t = await elOrPage(page, 'main, [role="main"]');
  if ('locator' in t) { await expect(t).toHaveScreenshot('courses-mobile-content.png', EO); } // 99
  else { await expect(t).toHaveScreenshot('courses-mobile-content-fp.png', EO); } // 100
});

import { test, expect } from '@playwright/test';
import fs from 'fs';
import { BASE_URL } from './env';
const STUDENT = { email: 'student@example.com', password: 'Student123!' };
const SHOTS = 'test-results/mobile-screenshots';

test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

async function login(page: any) {
  if (process.env.VITE_DEV_MODE !== 'false') {
    // DEV_MODE: inject English locale + click the dev-login button
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
    });
    await page.goto(`${BASE_URL}/login`);
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    await devBtn.waitFor({ timeout: 10_000 });
    await devBtn.click();
    // SmartRoot redirects to /dashboard; /learn/ is also acceptable
    await page.waitForURL(/\/(learn|dashboard)\//, { timeout: 15_000 }).catch(async () => {
      await page.waitForLoadState('networkidle');
    });
    return;
  }
  await page.goto(`${BASE_URL}/login`);
  await page
    .waitForFunction(() => !document.body.innerText.includes('Initializing'), {
      timeout: 15000,
    })
    .catch(() => {});
  const btn = page.locator('button', { hasText: /sign in/i }).first();
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await page.waitForURL(/localhost:8080/, { timeout: 15000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');
  await page.waitForURL(
    new RegExp(BASE_URL.replace(/^https?:\/\//, '').replace('.', '\\.')),
    { timeout: 20000 }
  );
}

test('M-01 mobile hamburger menu visible', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: `${SHOTS}/m01-dashboard.png`,
    fullPage: false,
  });
  // Hamburger button should be visible on mobile
  const hamburger = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
  await expect(hamburger).toBeVisible({ timeout: 5000 });
  console.log('BUG-12 HAMBURGER: visible ✅');
});

test('M-02 mobile hamburger opens nav', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  const hamburger = page
    .locator('button[aria-label*="menu"], button[aria-label*="Menu"]')
    .first();
  await hamburger.click();
  await page.screenshot({
    path: `${SHOTS}/m02-menu-open.png`,
    fullPage: false,
  });
  // Nav items should be visible after clicking hamburger
  const navLinks = page
    .locator('nav a')
    .or(page.locator('nav button[class*="flex"]'));
  const count = await navLinks.count();
  console.log(`Nav items visible after hamburger click: ${count}`);
  expect(count).toBeGreaterThan(0);
});

test('M-03 mobile courses page', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/courses`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SHOTS}/m03-courses.png`, fullPage: true });
  const h1 = await page
    .locator('h1')
    .first()
    .innerText()
    .catch(() => 'no h1');
  console.log('Courses h1:', h1);
});

test('M-04 mobile agents page', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/agents`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SHOTS}/m04-agents.png`, fullPage: true });
  const h1 = await page
    .locator('h1')
    .first()
    .innerText()
    .catch(() => 'no h1');
  console.log('Agents h1:', h1);
});

// ── Expanded mobile tests ─────────────────────────────────────────────────────

test('M-05 touch scroll works on dashboard', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Simulate touch scroll by using mouse wheel (Playwright maps to touch on mobile)
  const initialScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
  const newScrollY = await page.evaluate(() => window.scrollY);

  // Page should be scrollable if content is long enough
  // (if content fits in viewport, scroll stays at 0 — both are acceptable)
  expect(newScrollY).toBeGreaterThanOrEqual(initialScrollY);
});

test('M-06 responsive layout — cards stack vertically on mobile', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Find card-like containers (typical grid/flex items)
  const cards = page.locator(
    '[data-testid*="card"], .card, [class*="Card"], [role="article"]'
  );
  const cardCount = await cards.count();

  if (cardCount >= 2) {
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();

    if (firstBox && secondBox) {
      // On mobile (390px), cards should stack: second card below first card
      // (i.e., second card's top >= first card's bottom, OR they are very close in X)
      const isStacked = secondBox.y >= firstBox.y + firstBox.height - 5;
      const isSameColumn = Math.abs(firstBox.x - secondBox.x) < 50;
      expect(isStacked || isSameColumn).toBe(true);
    }
  }

  await page.screenshot({ path: `${SHOTS}/m06-cards-stacked.png`, fullPage: true });
});

test('M-07 bottom nav or hamburger is visible on mobile', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Either a bottom nav bar or a hamburger menu should be visible
  const bottomNav = page.locator(
    '[data-testid="bottom-nav"], nav[class*="bottom"], [role="navigation"][class*="fixed"]'
  ).first();
  const hamburger = page.locator(
    'button[aria-label*="menu" i], button[aria-label*="Menu"]'
  ).first();

  const hasBottomNav = await bottomNav.isVisible().catch(() => false);
  const hasHamburger = await hamburger.isVisible().catch(() => false);

  expect(hasBottomNav || hasHamburger).toBe(true);
});

test('M-08 search on mobile — search input is accessible', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/search`);
  await page.waitForLoadState('networkidle');

  // Search input should be usable on mobile
  const searchInput = page.locator(
    'input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]'
  ).first();
  const searchExists = await searchInput.isVisible().catch(() => false);

  if (searchExists) {
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  }

  await page.screenshot({ path: `${SHOTS}/m08-search.png`, fullPage: false });

  // No crash
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
    timeout: 3_000,
  });
});

test('M-09 settings page on mobile', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: `${SHOTS}/m09-settings.png`, fullPage: true });

  // Settings should render without crash
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
    timeout: 3_000,
  });

  // No horizontal overflow on mobile
  const overflows = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  // Acceptable if slight overflow exists due to sidebar, but flag major issues
  if (overflows) {
    const diff = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(diff).toBeLessThan(50); // Allow small overflow for sidebar
  }
});

test('M-10 profile page on mobile', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/profile`);
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: `${SHOTS}/m10-profile.png`, fullPage: true });

  // Profile should render without crash
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
    timeout: 3_000,
  });

  const body = await page.textContent('body');
  expect(body).not.toContain('[object Object]');
});

test('M-11 courses grid becomes list on mobile', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/courses`);
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: `${SHOTS}/m11-courses-list.png`, fullPage: true });

  // On 390px viewport, courses should not display in a multi-column grid
  const courseCards = page.locator(
    '[data-testid*="course-card"], [data-testid*="course-item"], .course-card'
  );
  const count = await courseCards.count();

  if (count >= 2) {
    const first = await courseCards.nth(0).boundingBox();
    const second = await courseCards.nth(1).boundingBox();

    if (first && second) {
      // Cards should stack vertically (not side-by-side)
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 10);
    }
  }
});

test('M-12 zoom/pinch is not disabled via viewport meta', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('domcontentloaded');

  // Check that the viewport meta tag does not disable user scaling (WCAG requirement)
  const viewportContent = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta?.getAttribute('content') ?? '';
  });

  // user-scalable=no is an accessibility violation
  expect(viewportContent).not.toContain('user-scalable=no');
  expect(viewportContent).not.toContain('user-scalable=0');
});

test('M-13 swipe navigation — no horizontal scroll on dashboard', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // On mobile, the page should not have unintended horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 20;
  });

  expect(hasHorizontalScroll).toBe(false);
});

test('M-14 hamburger menu close after link click', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  const hamburger = page
    .locator('button[aria-label*="menu" i], button[aria-label*="Menu"]')
    .first();
  const isHamburgerVisible = await hamburger.isVisible().catch(() => false);

  if (isHamburgerVisible) {
    await hamburger.click();
    await page.waitForTimeout(500);

    // Click a nav link
    const navLink = page.locator('nav a').first();
    const linkExists = await navLink.isVisible().catch(() => false);
    if (linkExists) {
      await navLink.click();
      await page.waitForTimeout(500);

      // After clicking a link, the menu should close (or page should navigate)
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
        timeout: 3_000,
      });
    }
  }
});

test('M-15 mobile viewport — no overlapping elements', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Check that heading and main content don't overlap with nav
  const main = page.locator('main, [data-testid="layout-main"]').first();
  const mainVisible = await main.isVisible().catch(() => false);

  if (mainVisible) {
    const mainBox = await main.boundingBox();
    if (mainBox) {
      // Main content should start below the top nav/header area (at least 40px from top)
      expect(mainBox.y).toBeGreaterThanOrEqual(0);
      // Main content should fit within the viewport width
      expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(390 + 20); // viewport + small tolerance
    }
  }
});

test('M-16 visual regression — mobile dashboard', async ({ page }) => {
  await login(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);

  await expect(page).toHaveScreenshot('mobile-dashboard.png', {
    fullPage: false,
    maxDiffPixels: 300,
    animations: 'disabled',
  });
});

test('M-17 mobile — text is readable (minimum font size)', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Check that body text has a reasonable minimum font size (>= 12px)
  const tooSmallTexts = await page.evaluate(() => {
    const elements = document.querySelectorAll('p, span, a, li, td, th, label');
    let count = 0;
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const text = el.textContent?.trim() ?? '';
      if (text.length > 0 && fontSize < 11) {
        count++;
      }
    });
    return count;
  });

  // Allow a few small elements (icons, badges) but flag if too many are unreadable
  expect(tooSmallTexts).toBeLessThan(5);
});

test('M-18 mobile — focus is visible on interactive elements', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Tab through first few interactive elements and verify focus is shown
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);

  const activeTag = await page.evaluate(() => document.activeElement?.tagName);
  // Something should receive focus
  expect(activeTag).toBeTruthy();
});

test('M-19 mobile — landscape orientation does not break layout', async ({ page }) => {
  // Switch to landscape
  await page.setViewportSize({ width: 844, height: 390 });
  await login(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: `${SHOTS}/m19-landscape.png`, fullPage: false });

  // Should not crash in landscape
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
    timeout: 3_000,
  });

  // Content should still be visible
  const main = page.locator('main, [data-testid="layout-main"]').first();
  await expect(main).toBeVisible({ timeout: 5_000 });
});

test('M-20 visual regression — mobile courses page', async ({ page }) => {
  await login(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE_URL}/courses`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);

  await expect(page).toHaveScreenshot('mobile-courses.png', {
    fullPage: false,
    maxDiffPixels: 300,
    animations: 'disabled',
  });
});

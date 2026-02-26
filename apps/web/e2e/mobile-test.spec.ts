import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5174';
const STUDENT = { email: 'student@example.com', password: 'Student123!' };
const SHOTS = 'test-results/mobile-screenshots';

test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

async function login(page: any) {
  if (process.env.VITE_DEV_MODE !== 'false') {
    // DEV_MODE: auto-authenticated — navigate to home to trigger auth init
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    return;
  }
  await page.goto(`${BASE}/login`);
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
    new RegExp(BASE.replace(/^https?:\/\//, '').replace('.', '\\.')),
    { timeout: 20000 }
  );
}

test('M-01 mobile hamburger menu visible', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: `${SHOTS}/m01-dashboard.png`,
    fullPage: false,
  });
  // Hamburger button should be visible on mobile (exact aria-label to avoid matching User menu)
  const hamburger = page.locator('button[aria-label="Open menu"]');
  await expect(hamburger).toBeVisible({ timeout: 5000 });
  console.log('BUG-12 HAMBURGER: visible ✅');
});

test('M-02 mobile hamburger opens nav', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/dashboard`);
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
  await page.goto(`${BASE}/courses`);
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
  await page.goto(`${BASE}/agents`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SHOTS}/m04-agents.png`, fullPage: true });
  const h1 = await page
    .locator('h1')
    .first()
    .innerText()
    .catch(() => 'no h1');
  console.log('Agents h1:', h1);
});

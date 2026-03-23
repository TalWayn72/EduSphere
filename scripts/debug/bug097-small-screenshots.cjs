/**
 * BUG-097 — Take viewport-only (not fullPage) screenshots of failing pages
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5174';
const DIR = path.resolve(__dirname, '../../docs/screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });
  await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Dashboard - viewport only
  await page.screenshot({ path: path.join(DIR, 'bug097-dash-viewport.png'), fullPage: false });
  console.log('Dashboard screenshot saved');

  // Scroll down to see more content
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(DIR, 'bug097-dash-scrolled.png'), fullPage: false });
  console.log('Dashboard scrolled screenshot saved');

  // Check the page title and first heading
  const title = await page.title();
  const h1 = await page.locator('h1').first().textContent().catch(() => 'none');
  console.log('Page title:', title);
  console.log('First h1:', h1);

  await browser.close();
})();

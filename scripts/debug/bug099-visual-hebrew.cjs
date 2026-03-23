/**
 * BUG-099: Visual Hebrew verification script
 * Launches Chromium with Hebrew locale, logs in, and screenshots key pages.
 * Checks for Hebrew characters and 400 errors.
 */
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const BASE = 'http://localhost:5173';

const PAGES = [
  { path: '/challenges', file: 'bug099-challenges-hebrew.png' },
  { path: '/peer-matching', file: 'bug099-peermatching-hebrew.png' },
  { path: '/discussions', file: 'bug099-discussions-hebrew.png' },
];

const HEBREW_RE = /[\u0590-\u05FF]/;

async function main() {
  const consoleErrors = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'he',
    extraHTTPHeaders: { 'Accept-Language': 'he' },
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Capture console errors & 400s
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (resp) => {
    if (resp.status() === 400) {
      consoleErrors.push(`400 error: ${resp.url()}`);
      console.log(`[400] ${resp.url()}`);
    }
  });

  // 1. Navigate to app
  console.log('Navigating to', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 2. Login via Keycloak (two-step: nav → /login page → Keycloak form)
  console.log('Step 1: Click nav login link...');

  // First, go directly to /login page
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('On /login page, URL:', page.url());

  // Click the "כניסה באמצעות Keycloak" button
  const keycloakBtn = page.locator('button:has-text("Keycloak")');
  const keycloakCount = await keycloakBtn.count();
  console.log(`Found ${keycloakCount} Keycloak buttons`);
  if (keycloakCount > 0) {
    console.log('Step 2: Clicking Keycloak button...');
    await keycloakBtn.first().click();
    await page.waitForTimeout(5000);

    const url = page.url();
    console.log('Current URL after Keycloak click:', url);

    if (url.includes('keycloak') || url.includes('realms')) {
      console.log('Step 3: On Keycloak login form, filling credentials...');
      await page.fill('#username', 'student@example.com');
      await page.fill('#password', 'Student123!');
      await page.click('#kc-login');
      await page.waitForTimeout(5000);
      console.log('After login URL:', page.url());
    } else {
      console.log('WARNING: Did not reach Keycloak form');
    }
  } else {
    // Try other button text
    const allButtons = page.locator('button');
    const btnCount = await allButtons.count();
    console.log(`Total buttons on page: ${btnCount}`);
    for (let i = 0; i < btnCount; i++) {
      const text = await allButtons.nth(i).textContent();
      console.log(`  Button ${i}: "${text}"`);
    }
  }

  // 3. Navigate to each page and screenshot
  for (const { path: pagePath, file } of PAGES) {
    const fullUrl = `${BASE}${pagePath}`;
    console.log(`\nNavigating to ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const screenshotPath = path.join(SCREENSHOT_DIR, file);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Check for Hebrew
    const bodyText = await page.textContent('body');
    const hasHebrew = HEBREW_RE.test(bodyText || '');
    console.log(`Hebrew characters on ${pagePath}: ${hasHebrew ? 'YES' : 'NO'}`);
    if (!hasHebrew) {
      console.log('WARNING: No Hebrew characters found on page!');
    }
  }

  // 4. Report 400 errors
  console.log('\n--- 400 Errors Summary ---');
  const errors400 = consoleErrors.filter((e) => e.includes('400'));
  if (errors400.length > 0) {
    console.log(`Found ${errors400.length} 400 errors:`);
    errors400.forEach((e) => console.log(`  ${e}`));
  } else {
    console.log('No 400 errors detected.');
  }

  console.log('\n--- Console Errors Summary ---');
  if (consoleErrors.length > 0) {
    console.log(`Found ${consoleErrors.length} console errors:`);
    consoleErrors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
  } else {
    console.log('No console errors detected.');
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});

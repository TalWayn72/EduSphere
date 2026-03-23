const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function main() {
  // Dynamic import playwright from the project's node_modules
  const playwrightPath = path.join(__dirname, '..', '..', 'node_modules', 'playwright');
  let pw;
  try {
    pw = require(playwrightPath);
  } catch (e) {
    // Try global @playwright/test
    const altPath = path.join(__dirname, '..', '..', 'node_modules', '@playwright', 'test');
    pw = require(altPath);
  }
  const { chromium } = pw;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Collect 400+ network errors
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(response.status() + ' ' + response.url());
    }
  });

  try {
    // 1. Navigate to app
    console.log('1. Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-landing.png'), fullPage: false });
    console.log('   Landing page loaded');

    // 2. Login via Keycloak
    console.log('2. Logging in as student@example.com...');
    // Look for login link/button
    const loginSelectors = [
      'a[href*="login"]',
      'button:has-text("Login")',
      'button:has-text("Sign")',
      'button:has-text("כניסה")',
      'a:has-text("כניסה")',
      'a:has-text("Login")',
      'a:has-text("התחברות")'
    ];

    let clicked = false;
    for (const sel of loginSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        clicked = true;
        console.log('   Clicked: ' + sel);
        break;
      }
    }

    if (!clicked) {
      // Navigate to a protected route to trigger redirect
      console.log('   No login button found, navigating to /courses to trigger redirect...');
      await page.goto(BASE_URL + '/courses', { waitUntil: 'networkidle', timeout: 15000 });
    }

    // Wait for Keycloak login page
    await page.waitForTimeout(3000);

    // If we're on Keycloak, fill credentials
    const usernameField = page.locator('#username, input[name="username"]');
    if (await usernameField.isVisible({ timeout: 8000 }).catch(() => false)) {
      console.log('   Keycloak login page detected');
      await usernameField.fill('student@example.com');
      await page.locator('#password, input[name="password"]').fill('Student123!');
      await page.locator('#kc-login, button[type="submit"], input[type="submit"]').click();

      // Wait for redirect back to app
      try {
        await page.waitForURL(/localhost:5173/, { timeout: 15000 });
        console.log('   Logged in successfully');
      } catch (e) {
        console.log('   Warning: Did not redirect to app after login');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-login-issue.png') });
      }
    } else {
      console.log('   No Keycloak form found (may already be logged in)');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-after-login.png'), fullPage: false });

    // 3. Navigate to challenges page
    console.log('3. Navigating to /challenges...');
    await page.goto(BASE_URL + '/challenges', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-challenges-he.png'), fullPage: false });

    // Check for Hebrew content
    const challengesText = await page.textContent('body');
    const hasHebrew = /[\u0590-\u05FF]/.test(challengesText);
    const hasEnglishStrings = /(Group Challenges|Create Challenge|Active Challenges)/i.test(challengesText);
    console.log('   Hebrew present: ' + hasHebrew);
    console.log('   English UI strings: ' + hasEnglishStrings);
    if (hasHebrew && !hasEnglishStrings) {
      console.log('   RESULT: PASS - Challenges page is in Hebrew');
    } else if (!hasHebrew) {
      console.log('   RESULT: WARN - No Hebrew characters found');
    } else {
      console.log('   RESULT: FAIL - English UI strings found');
    }

    // 4. Navigate to peer-matching
    console.log('4. Navigating to /peer-matching...');
    await page.goto(BASE_URL + '/peer-matching', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-peer-matching-he.png'), fullPage: false });

    const peerText = await page.textContent('body');
    const peerHebrew = /[\u0590-\u05FF]/.test(peerText);
    const peerEnglish = /(Peer Matching|Find Peers|Match)/i.test(peerText);
    console.log('   Hebrew present: ' + peerHebrew);
    console.log('   English UI strings: ' + peerEnglish);
    console.log('   RESULT: ' + (peerHebrew ? 'PASS' : 'WARN'));

    // 5. Navigate to discussions
    console.log('5. Navigating to /discussions...');
    await page.goto(BASE_URL + '/discussions', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-discussions-he.png'), fullPage: false });

    const discText = await page.textContent('body');
    const discHebrew = /[\u0590-\u05FF]/.test(discText);
    const discEnglish = /(Discussions|Create Discussion|Recent Discussions)/i.test(discText);
    console.log('   Hebrew present: ' + discHebrew);
    console.log('   English UI strings: ' + discEnglish);
    console.log('   RESULT: ' + (discHebrew ? 'PASS' : 'WARN'));

    // 6. Report errors
    console.log('\n--- Network Errors (400+) ---');
    if (networkErrors.length === 0) {
      console.log('   NONE - PASS');
    } else {
      const unique400 = [...new Set(networkErrors)];
      unique400.forEach(e => console.log('   ' + e));
      console.log('   Total: ' + networkErrors.length + ' errors (' + unique400.length + ' unique)');
    }

    console.log('\n--- Console Errors ---');
    if (consoleErrors.length === 0) {
      console.log('   NONE - PASS');
    } else {
      const uniqueErrors = [...new Set(consoleErrors)];
      uniqueErrors.slice(0, 10).forEach(e => console.log('   ' + e.substring(0, 200)));
      console.log('   Total: ' + consoleErrors.length + ' errors (' + uniqueErrors.length + ' unique)');
    }

    console.log('\n--- Screenshots saved to docs/screenshots/ ---');
    console.log('   bug099-landing.png');
    console.log('   bug099-after-login.png');
    console.log('   bug099-challenges-he.png');
    console.log('   bug099-peer-matching-he.png');
    console.log('   bug099-discussions-he.png');

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-ERROR.png'), fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

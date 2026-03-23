const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function main() {
  const playwrightPath = path.join(__dirname, '..', '..', 'node_modules', 'playwright');
  const { chromium } = require(playwrightPath);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Collect errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
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
    console.log('   Landing page loaded');

    // 2. Click "Sign In with Keycloak" button
    console.log('2. Clicking Sign In with Keycloak...');
    const signInBtn = page.locator('button:has-text("Sign In with Keycloak"), a:has-text("Sign In with Keycloak")').first();
    if (await signInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signInBtn.click();
    } else {
      // Try the Log In link in header
      const logInLink = page.locator('a:has-text("Log In")').first();
      if (await logInLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logInLink.click();
        await page.waitForTimeout(2000);
        // Now look for Sign In with Keycloak on the login page
        const kcBtn = page.locator('button:has-text("Sign In with Keycloak"), button:has-text("Keycloak")').first();
        if (await kcBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await kcBtn.click();
        }
      }
    }

    // Wait for Keycloak page
    console.log('   Waiting for Keycloak redirect...');
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    console.log('   Current URL: ' + currentUrl);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-keycloak-form.png'), fullPage: false });

    // Fill Keycloak form if visible
    const usernameField = page.locator('#username, input[name="username"]');
    if (await usernameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Keycloak form detected, filling credentials...');
      await usernameField.fill('student@example.com');
      await page.locator('#password, input[name="password"]').fill('Student123!');
      await page.locator('#kc-login, button[type="submit"], input[type="submit"]').click();

      try {
        await page.waitForURL(/localhost:5173/, { timeout: 15000 });
        console.log('   Login successful!');
      } catch (e) {
        console.log('   Warning: redirect timeout. URL: ' + page.url());
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-login-timeout.png') });
      }
    } else {
      console.log('   No Keycloak form found. URL: ' + currentUrl);
      // Maybe auth is handled differently - check if we're already authenticated
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-after-login.png'), fullPage: false });
    console.log('   After-login URL: ' + page.url());

    // Check if we're logged in by looking for user-specific UI
    const bodyText = await page.textContent('body');
    const isLoggedIn = !bodyText.includes('Sign In with Keycloak') && !bodyText.includes('Welcome to EduSphere');
    console.log('   Appears logged in: ' + isLoggedIn);

    // 3. Navigate to challenges
    console.log('\n3. Navigating to /challenges...');
    // Reset network errors for page-specific tracking
    const challengeErrors = [];
    const challengeHandler = response => {
      if (response.status() >= 400) challengeErrors.push(response.status() + ' ' + response.url());
    };
    page.on('response', challengeHandler);

    await page.goto(BASE_URL + '/challenges', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-challenges-he.png'), fullPage: false });

    const challengesText = await page.textContent('body');
    const chHebrew = /[\u0590-\u05FF]/.test(challengesText);
    const chEnglish = /(Group Challenges|Create Challenge|Active Challenges)/i.test(challengesText);
    console.log('   Hebrew: ' + chHebrew + ' | English UI strings: ' + chEnglish);
    console.log('   400 errors on this page: ' + challengeErrors.filter(e => e.startsWith('400')).length);
    console.log('   RESULT: ' + (chHebrew && !chEnglish ? 'PASS' : chHebrew ? 'PARTIAL (some English)' : 'NOT AUTHENTICATED (showing login page)'));

    // 4. Navigate to peer-matching
    console.log('\n4. Navigating to /peer-matching...');
    await page.goto(BASE_URL + '/peer-matching', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-peer-matching-he.png'), fullPage: false });

    const peerText = await page.textContent('body');
    const pmHebrew = /[\u0590-\u05FF]/.test(peerText);
    console.log('   Hebrew: ' + pmHebrew);
    console.log('   RESULT: ' + (pmHebrew ? 'PASS' : 'NOT AUTHENTICATED'));

    // 5. Navigate to discussions
    console.log('\n5. Navigating to /discussions...');
    await page.goto(BASE_URL + '/discussions', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-discussions-he.png'), fullPage: false });

    const discText = await page.textContent('body');
    const dHebrew = /[\u0590-\u05FF]/.test(discText);
    console.log('   Hebrew: ' + dHebrew);
    console.log('   RESULT: ' + (dHebrew ? 'PASS' : 'NOT AUTHENTICATED'));

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Network 400 errors: ' + networkErrors.length);
    if (networkErrors.length > 0) {
      const unique = [...new Set(networkErrors)];
      unique.slice(0, 5).forEach(e => console.log('  ' + e));
    }
    console.log('Console errors: ' + consoleErrors.length);
    if (consoleErrors.length > 0) {
      [...new Set(consoleErrors)].slice(0, 5).forEach(e => console.log('  ' + e.substring(0, 150)));
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug099-ERROR.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

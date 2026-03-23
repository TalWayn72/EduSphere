/**
 * BUG-104 / BUG-105 Visual Verification Script
 *
 * Usage: node scripts/debug/bug104-105-visual-verify.cjs
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log(`[BUG-104/105] Starting visual verification at ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // Step 1: Login via Keycloak
    console.log('[BUG-104/105] Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const signInBtn = page.locator('button:has-text("Sign In with Keycloak")');
    await signInBtn.waitFor({ timeout: 10000 });
    console.log('[BUG-104/105] Clicking Sign In with Keycloak...');
    await signInBtn.click();

    // Keycloak login form
    await page.waitForURL(/localhost:8080/, { timeout: 20000 });
    await page.locator('#username').waitFor({ timeout: 10000 });
    await page.fill('#username', 'student@example.com');
    await page.fill('#password', 'Student123!');
    await page.click('#kc-login');

    // Wait for redirect back to app
    await page.waitForURL(/localhost:5173/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log(`[BUG-104/105] Logged in, at: ${page.url()}`);

    // Step 2: Navigate to /agents via client-side navigation (clicking sidebar link)
    // This preserves the auth state unlike page.goto() which re-triggers Keycloak init
    console.log('[BUG-104/105] Navigating to /agents via URL bar...');

    // Clear error collectors for the /agents page specifically
    consoleErrors.length = 0;
    pageErrors.length = 0;

    // Use evaluate to do client-side navigation
    await page.evaluate(() => {
      window.history.pushState({}, '', '/agents');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(3000);

    // If client-side nav didn't render, try clicking sidebar link
    let pageText = await page.locator('body').innerText().catch(() => '');
    if (!pageText.includes('Agent') && !pageText.includes('agent')) {
      console.log('[BUG-104/105] Client-side nav may not have worked, trying sidebar link...');
      const agentLink = page.locator('a[href="/agents"]').or(page.locator('a[href*="agents"]'));
      if (await agentLink.count() > 0) {
        await agentLink.first().click();
        await page.waitForTimeout(3000);
      } else {
        // Direct navigation as last resort
        console.log('[BUG-104/105] No sidebar link found, using direct goto...');
        await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);
      }
    }

    pageText = await page.locator('body').innerText().catch(() => '');

    // If still showing "Initializing authentication...", wait more
    if (pageText.includes('Initializing authentication')) {
      console.log('[BUG-104/105] Page still initializing, waiting 10 more seconds...');
      await page.waitForTimeout(10000);
      pageText = await page.locator('body').innerText().catch(() => '');
    }

    // Take screenshot
    const agentsScreenshot = path.join(SCREENSHOTS_DIR, 'bug104-105-agents-page.png');
    await page.screenshot({ path: agentsScreenshot, fullPage: true });
    console.log(`[BUG-104/105] Screenshot saved: ${agentsScreenshot}`);

    // Report
    console.log(`\n=== Current URL: ${page.url()} ===`);
    console.log(`\n=== Page Text (first 1000 chars) ===\n${pageText.substring(0, 1000)}`);

    // BUG-104 check
    const invalidTimeErrors = consoleErrors.filter(e => e.includes('Invalid time value'));
    console.log('\n=== BUG-104: "Invalid time value" ===');
    console.log(invalidTimeErrors.length === 0 ? '  PASS' : `  FAIL (${invalidTimeErrors.length})`);
    invalidTimeErrors.forEach(e => console.log(`    ${e.substring(0, 200)}`));

    // BUG-105 check
    const nullFieldErrors = consoleErrors.filter(e => e.includes('Cannot return null'));
    console.log('\n=== BUG-105: "Cannot return null" ===');
    console.log(nullFieldErrors.length === 0 ? '  PASS' : `  FAIL (${nullFieldErrors.length})`);
    nullFieldErrors.forEach(e => console.log(`    ${e.substring(0, 200)}`));

    // Banner check
    const bannerHe = await page.locator('text=תבניות סוכן אינן נגישות').count();
    const bannerEn = await page.locator('text=Agent templates are not accessible').count();
    console.log('\n=== Disconnected Banner ===');
    console.log(bannerHe === 0 && bannerEn === 0 ? '  PASS: No banner' : '  FAIL: Banner visible');

    // Template cards
    console.log('\n=== Agent Template Cards ===');
    for (const tpl of ['Chavruta', 'Quiz', 'Summarize', 'Research', 'Explain']) {
      const c = await page.locator(`text=${tpl}`).count();
      console.log(`  ${c > 0 ? 'PASS' : 'WARN'}: "${tpl}" ${c > 0 ? `(${c})` : 'not found'}`);
    }

    // Headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log(`\n=== Headings: ${JSON.stringify(headings.slice(0, 5))} ===`);

    // All console errors
    console.log('\n=== All Console Errors ===');
    if (consoleErrors.length === 0) {
      console.log('  PASS: Zero');
    } else {
      consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 300)}`));
    }

    console.log('\n=== Page Errors ===');
    if (pageErrors.length === 0) {
      console.log('  PASS: Zero');
    } else {
      pageErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 300)}`));
    }

    // Summary
    const hasContent = pageText.length > 100 && !pageText.includes('Initializing authentication');
    console.log('\n======================================');
    console.log('  VERIFICATION SUMMARY');
    console.log('======================================');
    console.log(`  BUG-104 (Invalid time value):  ${invalidTimeErrors.length === 0 ? 'FIXED' : 'STILL PRESENT'}`);
    console.log(`  BUG-105 (Cannot return null):   ${nullFieldErrors.length === 0 ? 'FIXED' : 'STILL PRESENT'}`);
    console.log(`  No disconnected banner:         ${bannerHe === 0 && bannerEn === 0 ? 'OK' : 'BANNER SHOWING'}`);
    console.log(`  No uncaught errors:             ${pageErrors.length === 0 ? 'OK' : 'ERRORS FOUND'}`);
    console.log(`  Page rendered:                  ${hasContent ? 'YES' : 'NO (auth stuck or blank)'}`);
    console.log('======================================\n');

  } catch (err) {
    console.error(`[BUG-104/105] Error: ${err.message}`);
    try {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug104-105-ERROR.png'), fullPage: true });
    } catch { /* ignore */ }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

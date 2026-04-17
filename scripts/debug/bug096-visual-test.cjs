/**
 * BUG-096 Visual Verification Script
 * Navigates to Knowledge Graph page and checks for error banners.
 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');

(async () => {
  let browser;
  try {
    // Find chromium executable from Playwright installation
    browser = await chromium.launch({
      headless: true,
      channel: 'msedge', // Use Edge on Windows if chromium not bundled
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // Collect console messages
    const consoleMsgs = [];
    page.on('console', (msg) => {
      consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // 1. Navigate to landing page
    console.log('--- Step 1: Navigate to http://localhost:5173 ---');
    const landingResponse = await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    console.log(`Landing page status: ${landingResponse?.status()}`);
    await page.waitForTimeout(2000);

    const landingScreenshot = path.join(
      SCREENSHOTS_DIR,
      'bug096-01-landing.png'
    );
    await page.screenshot({ path: landingScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${landingScreenshot}`);

    // Check page title and visible text
    const landingTitle = await page.title();
    console.log(`Page title: ${landingTitle}`);
    const landingBodyText = await page.textContent('body');
    console.log(
      `Body text (first 500 chars): ${(landingBodyText || '').substring(0, 500)}`
    );

    // 2. Navigate to Knowledge Graph page
    console.log('\n--- Step 2: Navigate to /knowledge-graph ---');
    const kgResponse = await page.goto(
      'http://localhost:5173/knowledge-graph',
      {
        waitUntil: 'networkidle',
        timeout: 15000,
      }
    );
    console.log(`Knowledge Graph page status: ${kgResponse?.status()}`);
    await page.waitForTimeout(3000);

    const kgScreenshot = path.join(
      SCREENSHOTS_DIR,
      'bug096-02-knowledge-graph.png'
    );
    await page.screenshot({ path: kgScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${kgScreenshot}`);

    // 3. Check for error banners and key elements
    console.log('\n--- Step 3: Analyze Knowledge Graph page ---');
    const bodyText = await page.textContent('body');
    const bodyStr = bodyText || '';

    // Check for Hebrew error banner
    const hasServerError = bodyStr.includes('שרת לא נגיש');
    const hasMockData =
      bodyStr.includes('נתוני ריצוי') || bodyStr.includes('נתוני דמו');
    const hasAuthError =
      bodyStr.includes('Authentication') ||
      bodyStr.includes('אימות') ||
      bodyStr.includes('login');
    const hasNetworkError =
      bodyStr.includes('Network') ||
      bodyStr.includes('ECONNREFUSED') ||
      bodyStr.includes('fetch');
    const hasGraphQLError =
      bodyStr.includes('GraphQL') || bodyStr.includes('graphql');

    console.log('\n=== VERIFICATION RESULTS ===');
    console.log(`❌ "שרת לא נגיש" error banner visible: ${hasServerError}`);
    console.log(`❌ Mock data indicator visible: ${hasMockData}`);
    console.log(`🔍 Auth-related error visible: ${hasAuthError}`);
    console.log(`🔍 Network error visible: ${hasNetworkError}`);
    console.log(`🔍 GraphQL error visible: ${hasGraphQLError}`);

    // Look for alert/banner elements
    const alerts = await page.$$(
      '[role="alert"], .alert, .error-banner, .error, [class*="error"], [class*="alert"], [class*="banner"]'
    );
    console.log(`\nAlert/error elements found: ${alerts.length}`);
    for (let i = 0; i < alerts.length; i++) {
      const text = await alerts[i].textContent();
      console.log(
        `  Alert ${i + 1}: "${(text || '').trim().substring(0, 200)}"`
      );
    }

    // Look for graph/canvas/svg elements (knowledge graph visualization)
    const canvasElements = await page.$$(
      'canvas, svg, [class*="graph"], [class*="Graph"], [class*="knowledge"], [class*="Knowledge"]'
    );
    console.log(
      `\nGraph/visualization elements found: ${canvasElements.length}`
    );
    for (let i = 0; i < Math.min(canvasElements.length, 5); i++) {
      const tag = await canvasElements[i].evaluate(
        (el) => `${el.tagName} class="${el.className}"`
      );
      console.log(`  Element ${i + 1}: ${tag}`);
    }

    // Print visible text (truncated)
    console.log(
      `\nFull page text (first 1500 chars):\n${bodyStr.substring(0, 1500)}`
    );

    // Print console messages from the page
    if (consoleMsgs.length > 0) {
      console.log(`\nBrowser console messages (${consoleMsgs.length}):`);
      consoleMsgs.slice(0, 20).forEach((m) => console.log(`  ${m}`));
    }

    console.log('\n=== TEST COMPLETE ===');
  } catch (err) {
    console.error('Test failed:', err.message);
    if (
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ERR_CONNECTION_REFUSED')
    ) {
      console.error(
        '>>> The dev server at localhost:5173 is NOT running. Start it with: pnpm --filter @edusphere/web dev'
      );
    }
  } finally {
    if (browser) await browser.close();
  }
})();

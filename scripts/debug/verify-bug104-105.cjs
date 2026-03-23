const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log('Navigating to http://localhost:5173/agents ...');
  try {
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded successfully (networkidle)');
  } catch (e) {
    console.log('networkidle timeout, trying domcontentloaded...');
    try {
      await page.goto('http://localhost:5173/agents', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(5000);
      console.log('Page loaded with fallback (domcontentloaded + 5s wait)');
    } catch (e2) {
      console.log('FATAL: Cannot reach page: ' + e2.message);
      await browser.close();
      process.exit(1);
    }
  }

  // Wait for dynamic content
  await page.waitForTimeout(3000);

  // Take screenshot
  const screenshotPath = 'C:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug104-105-AFTER-fix.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to: ' + screenshotPath);

  // Check page content
  const pageContent = await page.textContent('body');

  // Check for offline mode banner
  const hasOfflineBanner = pageContent.includes('\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05E1\u05D5\u05DB\u05DF \u05D0\u05D9\u05E0\u05DF \u05E0\u05D2\u05D9\u05E9\u05D5\u05EA');
  console.log('\n=== OFFLINE BANNER CHECK ===');
  console.log('Offline/unavailable banner present: ' + hasOfflineBanner);

  // Check for agent template cards
  const cards = await page.locator('[class*="card"], [class*="Card"], [class*="template"], [class*="Template"], [data-testid*="agent"], [data-testid*="template"]').count();
  console.log('\n=== AGENT TEMPLATE CARDS ===');
  console.log('Template card-like elements found: ' + cards);

  // Check page headings
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('Page headings: ' + JSON.stringify(headings.map(h => h.trim()).filter(Boolean)));

  // BUG-104: Invalid time value
  console.log('\n=== BUG-104 CHECK (Invalid time value) ===');
  const bug104Console = consoleErrors.filter(e => e.includes('Invalid time value'));
  const bug104Page = pageErrors.filter(e => e.includes('Invalid time value'));
  if (bug104Console.length === 0 && bug104Page.length === 0) {
    console.log('BUG-104: FIXED - No "Invalid time value" errors found');
  } else {
    console.log('BUG-104: STILL BROKEN');
    bug104Console.forEach(e => console.log('  Console: ' + e.substring(0, 200)));
    bug104Page.forEach(e => console.log('  Page: ' + e.substring(0, 200)));
  }

  // BUG-105: Cannot return null for non-nullable field AgentTemplate.templateType
  console.log('\n=== BUG-105 CHECK (AgentTemplate.templateType null) ===');
  const bug105Console = consoleErrors.filter(e => e.includes('Cannot return null') || e.includes('templateType') || e.includes('non-nullable'));
  const bug105Page = pageErrors.filter(e => e.includes('Cannot return null') || e.includes('templateType') || e.includes('non-nullable'));
  if (bug105Console.length === 0 && bug105Page.length === 0) {
    console.log('BUG-105: FIXED - No "Cannot return null for non-nullable field" errors found');
  } else {
    console.log('BUG-105: STILL BROKEN');
    bug105Console.forEach(e => console.log('  Console: ' + e.substring(0, 200)));
    bug105Page.forEach(e => console.log('  Page: ' + e.substring(0, 200)));
  }

  // Print all console errors
  console.log('\n=== ALL CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.forEach((e, i) => console.log('  [' + i + '] ' + e.substring(0, 300)));

  console.log('\n=== ALL PAGE ERRORS (' + pageErrors.length + ') ===');
  pageErrors.forEach((e, i) => console.log('  [' + i + '] ' + e.substring(0, 300)));

  // Check for yellow warning banner
  const yellowBanners = await page.locator('[class*="warning"], [class*="Warning"], [class*="alert"], [class*="Alert"], [role="alert"]').count();
  console.log('\n=== WARNING/ALERT BANNERS ===');
  console.log('Warning/alert elements found: ' + yellowBanners);
  if (yellowBanners > 0) {
    const bannerTexts = await page.locator('[class*="warning"], [class*="Warning"], [class*="alert"], [class*="Alert"], [role="alert"]').allTextContents();
    bannerTexts.forEach((t, i) => console.log('  Banner ' + i + ': ' + t.trim().substring(0, 200)));
  }

  // Page content snippet
  const snippet = pageContent.substring(0, 800).replace(/\s+/g, ' ').trim();
  console.log('\n=== PAGE CONTENT SNIPPET (first 800 chars) ===');
  console.log(snippet);

  await browser.close();
  console.log('\nDone.');
})();

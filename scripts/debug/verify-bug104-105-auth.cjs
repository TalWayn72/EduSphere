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

  // Step 1: Navigate to agents page (will redirect to login)
  console.log('Step 1: Navigating to /agents ...');
  await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Current URL: ' + page.url());

  // Step 2: Check if we're on login page and need to authenticate
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('keycloak') || currentUrl.includes('Sign In') || currentUrl === 'http://localhost:5173/') {
    console.log('Step 2: On login page, attempting Keycloak login...');

    // Check if there's a Keycloak redirect or a custom login page
    const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), a:has-text("Sign In"), a:has-text("Login"), button:has-text("התחבר")');
    const loginCount = await loginButton.count();
    console.log('Login buttons found: ' + loginCount);

    if (loginCount > 0) {
      // Click the first login button to trigger Keycloak redirect
      await loginButton.first().click();
      await page.waitForTimeout(3000);
      console.log('After login click URL: ' + page.url());
    }

    // If redirected to Keycloak login form
    if (page.url().includes('keycloak') || page.url().includes(':8080')) {
      console.log('On Keycloak login form, entering credentials...');
      await page.fill('#username, input[name="username"]', 'super.admin@edusphere.dev');
      await page.fill('#password, input[name="password"]', 'SuperAdmin123!');
      await page.click('#kc-login, button[type="submit"], input[type="submit"]');
      await page.waitForTimeout(5000);
      console.log('After Keycloak login URL: ' + page.url());
    }

    // Navigate to agents page after login
    if (!page.url().includes('/agents')) {
      console.log('Navigating to /agents after login...');
      await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 30000 });
    }
  }

  console.log('Final URL: ' + page.url());

  // Wait for dynamic content
  await page.waitForTimeout(3000);

  // Take screenshot
  const screenshotPath = 'C:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug104-105-AFTER-fix.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to: ' + screenshotPath);

  // Check page content
  const pageContent = await page.textContent('body');

  // Check for offline mode banner (Hebrew: "תבניות סוכן אינן נגישות")
  const hasOfflineBanner = pageContent.includes('\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05E1\u05D5\u05DB\u05DF \u05D0\u05D9\u05E0\u05DF \u05E0\u05D2\u05D9\u05E9\u05D5\u05EA');
  console.log('\n=== OFFLINE BANNER CHECK ===');
  console.log('Offline/unavailable banner present: ' + hasOfflineBanner);

  // Check for agent template cards
  const cards = await page.locator('[class*="card"], [class*="Card"]').count();
  console.log('\n=== AGENT TEMPLATE CARDS ===');
  console.log('Card elements found: ' + cards);

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

  // Check for warning/alert banners
  const yellowBanners = await page.locator('[class*="warning"], [class*="Warning"], [class*="alert"], [class*="Alert"], [role="alert"]').count();
  console.log('\n=== WARNING/ALERT BANNERS ===');
  console.log('Warning/alert elements found: ' + yellowBanners);
  if (yellowBanners > 0) {
    const bannerTexts = await page.locator('[class*="warning"], [class*="Warning"], [class*="alert"], [class*="Alert"], [role="alert"]').allTextContents();
    bannerTexts.forEach((t, i) => console.log('  Banner ' + i + ': ' + t.trim().substring(0, 200)));
  }

  // Page content snippet
  const snippet = pageContent.substring(0, 1000).replace(/\s+/g, ' ').trim();
  console.log('\n=== PAGE CONTENT SNIPPET ===');
  console.log(snippet);

  await browser.close();
  console.log('\nDone.');
})();

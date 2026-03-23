const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleErrors = [];
  page.on('console', function(msg) {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Step 1: Login via Keycloak on Docker container (port 5173)
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  var kcBtn = page.getByRole('link', { name: /log in/i }).first();
  if (await kcBtn.isVisible({ timeout: 5000 }).catch(function() { return false; })) {
    await kcBtn.click();
  } else {
    kcBtn = page.getByRole('button', { name: /sign in/i }).first();
    await kcBtn.click();
  }
  await page.waitForTimeout(5000);
  
  console.log('After login click URL:', page.url());
  
  var usernameField = page.locator('#username');
  if (await usernameField.isVisible({ timeout: 10000 }).catch(function() { return false; })) {
    await usernameField.fill('student@example.com');
    await page.locator('#password').fill('Student123!');
    await page.locator('#kc-login').click();
    await page.waitForTimeout(5000);
    console.log('After KC login URL:', page.url());
  } else {
    console.log('ERROR: Keycloak login form not visible');
  }
  
  // Step 2: Navigate to bug URL
  console.log('');
  console.log('Navigating to /settings?highlight=ai-consent...');
  await page.goto('http://localhost:5173/settings?highlight=ai-consent');
  await page.waitForTimeout(5000);
  
  // Step 3: Check results
  var hasCrash = await page.locator('text=Something went wrong').isVisible().catch(function() { return false; });
  var hasPrivacy = await page.locator('text=Privacy').isVisible().catch(function() { return false; });
  var hasToggle = await page.locator('#setting-ai-consent').isVisible().catch(function() { return false; });
  var headings = await page.locator('h1').allTextContents();
  
  console.log('');
  console.log('=== BUG-087 DOCKER VERIFICATION ===');
  console.log('URL:', page.url());
  console.log('CRASH UI:', hasCrash);
  console.log('H1 HEADINGS:', headings.join(', '));
  console.log('PRIVACY CARD:', hasPrivacy);
  console.log('AI TOGGLE:', hasToggle);
  
  var tooltipError = false;
  if (consoleErrors.length > 0) {
    console.log('');
    console.log('Console errors (' + consoleErrors.length + '):');
    for (var j = 0; j < Math.min(consoleErrors.length, 8); j++) {
      var err = consoleErrors[j].substring(0, 300);
      console.log('  ', err);
      if (err.includes('TooltipProvider')) tooltipError = true;
    }
  } else {
    console.log('');
    console.log('NO console errors!');
  }
  
  await page.screenshot({ path: '../../docs/screenshots/bug087-docker-verified.png', fullPage: true });
  
  var passed = (hasCrash === false) && hasToggle && (tooltipError === false);
  console.log('');
  console.log('=== VERDICT: ' + (passed ? 'PASS' : 'FAIL') + ' ===');
  console.log('Screenshot: docs/screenshots/bug087-docker-verified.png');
  
  await browser.close();
  process.exit(passed ? 0 : 1);
})();

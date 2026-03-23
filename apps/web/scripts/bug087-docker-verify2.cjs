const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  var consoleErrors = [];
  page.on('console', function(msg) {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Go directly to login page
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  // Click Sign In with Keycloak button
  var signInBtn = page.getByRole('button', { name: /sign in with keycloak/i });
  await signInBtn.waitFor({ timeout: 15000 });
  await signInBtn.click();
  
  // Wait for Keycloak login form
  await page.locator('#username').waitFor({ timeout: 20000 });
  await page.locator('#username').fill('student@example.com');
  await page.locator('#password').fill('Student123!');
  await page.locator('#kc-login').click();
  
  // Wait for redirect back to app
  await page.waitForURL(function(url) { return url.toString().includes('localhost:5173') && !url.toString().includes('/login'); }, { timeout: 30000 }).catch(function() {});
  await page.waitForTimeout(3000);
  console.log('Authenticated at:', page.url());
  
  // Navigate to bug URL
  // Clear previous errors
  consoleErrors = [];
  
  await page.goto('http://localhost:5173/settings?highlight=ai-consent');
  await page.waitForTimeout(5000);
  
  // Check results
  var hasCrash = await page.locator('text=Something went wrong').isVisible().catch(function() { return false; });
  var hasPrivacy = await page.locator('text=Privacy').isVisible().catch(function() { return false; });
  var hasToggle = await page.locator('#setting-ai-consent').isVisible().catch(function() { return false; });
  var headings = await page.locator('h1').allTextContents();
  
  console.log('');
  console.log('=== BUG-087 DOCKER VISUAL VERIFICATION ===');
  console.log('URL:', page.url());
  console.log('CRASH UI (Something went wrong):', hasCrash);
  console.log('HEADINGS:', headings.join(', '));
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
  
  await browser.close();
  process.exit(passed ? 0 : 1);
})();

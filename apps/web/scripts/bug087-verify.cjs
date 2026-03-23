const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleErrors = [];
  page.on('console', function(msg) {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.addInitScript(function() {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    sessionStorage.setItem('edusphere_dev_logged_in', 'true');
  });

  // Mock ALL GraphQL calls
  await page.route('**/graphql', async function(route) {
    var body = route.request().postDataJSON();
    var opName = (body && body.operationName) || '';
    
    if (opName === 'Me' || (body && body.query && body.query.includes('me {'))) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { me: { id: '1', preferences: { locale: 'en', theme: 'light', emailNotifications: true, pushNotifications: true } } }
        })
      });
    } else if (opName === 'MyTenantLanguageSettings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { myTenantLanguageSettings: { supportedLanguages: ['en', 'he'], defaultLanguage: 'en' } }
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} })
      });
    }
  });

  await page.goto('http://localhost:5175/settings?highlight=ai-consent', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  console.log('URL:', page.url());
  
  var hasCrash = await page.locator('text=Something went wrong').isVisible().catch(function() { return false; });
  var hasPrivacy = await page.locator('text=Privacy').isVisible().catch(function() { return false; });
  var hasToggle = await page.locator('#setting-ai-consent').isVisible().catch(function() { return false; });
  var headings = await page.locator('h1').allTextContents();
  
  console.log('');
  console.log('=== VISUAL VERIFICATION RESULTS ===');
  console.log('CRASH UI (Something went wrong):', hasCrash);
  console.log('H1 HEADINGS:', headings.join(', '));
  console.log('PRIVACY CARD:', hasPrivacy);
  console.log('AI TOGGLE:', hasToggle);
  
  if (consoleErrors.length > 0) {
    console.log('');
    console.log('Console errors (' + consoleErrors.length + '):');
    for (var i = 0; i < Math.min(consoleErrors.length, 8); i++) {
      console.log('  ', consoleErrors[i].substring(0, 300));
    }
  } else {
    console.log('');
    console.log('NO console errors!');
  }
  
  var passed = (hasCrash === false) && hasPrivacy && hasToggle;
  console.log('');
  console.log('=== VERDICT: ' + (passed ? 'PASS' : 'FAIL') + ' ===');
  
  await page.screenshot({ path: 'docs/screenshots/bug087-visual-proof.png', fullPage: true });
  console.log('Screenshot: docs/screenshots/bug087-visual-proof.png');
  
  await browser.close();
})();

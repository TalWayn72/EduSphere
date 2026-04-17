const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', function (msg) {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.addInitScript(function () {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    sessionStorage.setItem('edusphere_dev_logged_in', 'true');
  });

  // Mock ALL GraphQL and Keycloak calls
  await page.route('**/graphql', async function (route) {
    var body = route.request().postDataJSON();
    var opName = (body && body.operationName) || '';

    if (
      opName === 'Me' ||
      (body && body.query && body.query.includes('me {'))
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            me: {
              id: '1',
              preferences: {
                locale: 'en',
                theme: 'light',
                emailNotifications: true,
                pushNotifications: true,
              },
            },
          },
        }),
      });
    } else if (opName === 'MyTenantLanguageSettings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            myTenantLanguageSettings: {
              supportedLanguages: ['en', 'he'],
              defaultLanguage: 'en',
            },
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    }
  });

  // Block Keycloak iframe checks to prevent auth redirect
  await page.route('**/realms/**', function (route) {
    route.abort();
  });

  await page.goto('http://localhost:5175/settings?highlight=ai-consent', {
    waitUntil: 'domcontentloaded',
  });

  // Wait for content to render - check for Settings heading or crash
  var foundSettings = false;
  var foundCrash = false;
  for (var i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    foundSettings = await page
      .locator('h1:has-text("Settings")')
      .isVisible()
      .catch(function () {
        return false;
      });
    foundCrash = await page
      .locator('text=Something went wrong')
      .isVisible()
      .catch(function () {
        return false;
      });
    if (foundSettings || foundCrash) break;
  }

  // Take screenshot IMMEDIATELY when content is visible
  await page.screenshot({
    path: '../../docs/screenshots/bug087-visual-proof.png',
    fullPage: true,
  });

  var hasPrivacy = await page
    .locator('text=Privacy')
    .isVisible()
    .catch(function () {
      return false;
    });
  var hasToggle = await page
    .locator('#setting-ai-consent')
    .isVisible()
    .catch(function () {
      return false;
    });
  var hasHighlight = await page
    .locator('.animate-settings-highlight')
    .isVisible()
    .catch(function () {
      return false;
    });

  console.log('');
  console.log('=== BUG-087 VISUAL VERIFICATION ===');
  console.log('URL:', page.url());
  console.log('CRASH UI (Something went wrong):', foundCrash);
  console.log('SETTINGS heading visible:', foundSettings);
  console.log('PRIVACY CARD:', hasPrivacy);
  console.log('AI TOGGLE:', hasToggle);
  console.log('HIGHLIGHT animation:', hasHighlight);

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

  var passed =
    foundCrash === false &&
    foundSettings &&
    hasToggle &&
    tooltipError === false;
  console.log('');
  console.log('=== VERDICT: ' + (passed ? 'PASS' : 'FAIL') + ' ===');

  await browser.close();
  process.exit(passed ? 0 : 1);
})();

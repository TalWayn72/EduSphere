const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  console.log('Navigating to http://localhost:5173/agents ...');
  try {
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Navigation error:', e.message);
    await browser.close();
    process.exit(1);
  }

  // Wait for async errors
  await page.waitForTimeout(3000);

  // Check for the specific GraphQL error
  const hasTemplateTypeError = consoleMessages.some(m =>
    m.text.includes('Cannot return null for non-nullable field AgentTemplate.templateType')
  );

  // Check for offline banner
  let offlineBanner = false;
  try {
    offlineBanner = await page.locator('text=offline mode').first().isVisible();
  } catch (_) {}
  if (!offlineBanner) {
    try {
      offlineBanner = await page.locator('text=Offline').first().isVisible();
    } catch (_) {}
  }

  // Check for any alert/banner elements
  const banners = await page.evaluate(() => {
    const els = document.querySelectorAll('[role=alert], [class*=banner], [class*=warning], [class*=offline]');
    const results = [];
    for (const el of els) {
      results.push({
        text: (el.textContent || '').trim().substring(0, 200),
        visible: el.offsetParent !== null
      });
    }
    return results;
  });

  // Take screenshot
  await page.screenshot({
    path: 'C:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug105-FINAL-BROWSER.png',
    fullPage: true
  });

  console.log('\n=== RESULTS ===');
  console.log('BUG-105 GraphQL error in console:', hasTemplateTypeError ? 'YES (BUG PRESENT)' : 'NO (BUG FIXED)');
  console.log('Offline banner visible:', offlineBanner ? 'YES' : 'NO');

  console.log('\n=== Console Errors/Warnings ===');
  consoleMessages.forEach(m => {
    if (m.type === 'error' || m.type === 'warning') {
      console.log('[' + m.type + ']', m.text.substring(0, 300));
    }
  });

  // Also check for templateType mentions in any message
  const templateMsgs = consoleMessages.filter(m => m.text.includes('templateType') || m.text.includes('AgentTemplate'));
  if (templateMsgs.length > 0) {
    console.log('\n=== templateType-related messages ===');
    templateMsgs.forEach(m => console.log('[' + m.type + ']', m.text.substring(0, 300)));
  }

  if (pageErrors.length > 0) {
    console.log('\n=== Page Errors ===');
    pageErrors.forEach(e => console.log(e.substring(0, 300)));
  }

  if (banners.length > 0) {
    console.log('\n=== Banners/Alerts Found ===');
    banners.forEach(b => console.log('visible:', b.visible, '|', b.text));
  }

  // Check page body for offline text
  const bodyText = await page.textContent('body');
  const hasOfflineText = (bodyText || '').toLowerCase().includes('offline');
  console.log('\nPage contains "offline" text:', hasOfflineText ? 'YES' : 'NO');

  await browser.close();
  console.log('\nDone.');
})();

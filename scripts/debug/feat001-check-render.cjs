const {
  chromium,
} = require('C:/Users/P0039217/.claude/projects/EduSphere/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core');
const path = require('path');

const SCREENSHOTS_DIR =
  'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';
const BASE_URL = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  // Capture console messages from the page
  page.on('console', (msg) =>
    console.log(`[BROWSER ${msg.type()}]`, msg.text())
  );
  page.on('pageerror', (err) => console.log('[BROWSER ERROR]', err.message));

  // Login as instructor
  await page.goto(`${BASE_URL}/login`, { timeout: 15000 });
  await page.waitForTimeout(2000);
  const signInBtn = await page.$(
    'button:has-text("Sign In"), button:has-text("כניסה"), button[type="submit"]'
  );
  if (signInBtn) {
    await signInBtn.click();
    await page.waitForTimeout(5000);
  }
  if (page.url().includes('8080') || page.url().includes('keycloak')) {
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.fill('#username', 'instructor@example.com');
    await page.fill('#password', 'Instructor123!');
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => null),
      page.click('#kc-login'),
    ]);
    await page.waitForTimeout(3000);
  }

  // Go directly to edit page
  const editUrl = `${BASE_URL}/courses/9df04908-3ac9-4349-834c-46fd03add80d/edit`;
  console.log('Navigating to:', editUrl);
  await page.goto(editUrl, { timeout: 15000 });
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());

  // Dump the header area HTML
  const headerHTML = await page.evaluate(() => {
    // Look for the header section with buttons
    const headerDiv = document.querySelector(
      '.flex.items-center.justify-between'
    );
    return headerDiv ? headerDiv.innerHTML : 'HEADER NOT FOUND';
  });
  console.log('\n=== Header HTML ===');
  console.log(headerHTML.substring(0, 2000));

  // Check if DeleteCourseButton component exists in the JS bundle
  const hasDeleteInBundle = await page.evaluate(() => {
    // Check if the module loaded
    const scripts = document.querySelectorAll('script[type="module"]');
    return Array.from(scripts).map((s) => s.src);
  });
  console.log('\n=== Module scripts ===');
  console.log(JSON.stringify(hasDeleteInBundle, null, 2));

  // Check for any elements with "delete" in data-testid or text
  const deleteElements = await page.$$eval('*', (els) =>
    els
      .filter((e) => {
        const testid = e.getAttribute('data-testid') || '';
        const text = (e.textContent || '').toLowerCase();
        const ariaLabel = e.getAttribute('aria-label') || '';
        return (
          testid.includes('delete') ||
          ariaLabel.toLowerCase().includes('delete')
        );
      })
      .map((e) => ({
        tag: e.tagName,
        testid: e.getAttribute('data-testid'),
        text: (e.textContent || '').trim().substring(0, 60),
        ariaLabel: e.getAttribute('aria-label'),
        visible: e.offsetParent !== null,
      }))
  );
  console.log('\n=== Elements with "delete" ===');
  console.log(JSON.stringify(deleteElements, null, 2));

  // Also dump translated text for "deleteCourse" key
  const i18nCheck = await page.evaluate(() => {
    // Check if i18next is accessible
    if (window.__i18n || window.i18next) {
      return 'i18n found';
    }
    return 'i18n not directly accessible';
  });
  console.log('\ni18n check:', i18nCheck);

  // Take full-page screenshot
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'feat001-debug-editpage.png'),
    fullPage: true,
  });
  console.log('Screenshot saved: feat001-debug-editpage.png');

  await ctx.close();
  await browser.close();
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

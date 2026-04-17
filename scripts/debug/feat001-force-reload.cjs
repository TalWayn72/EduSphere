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

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR]`, msg.text());
  });

  // Login as instructor with cache busting
  await page.goto(`${BASE_URL}/login?_=${Date.now()}`, {
    timeout: 15000,
    waitUntil: 'networkidle',
  });
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
  console.log('Logged in, URL:', page.url());

  // Force hard reload of the edit page to get latest JS
  const editUrl = `${BASE_URL}/courses/9df04908-3ac9-4349-834c-46fd03add80d/edit`;

  // Clear cache
  const client = await page.context().newCDPSession(page);
  await client.send('Network.clearBrowserCache');
  console.log('Browser cache cleared');

  await page.goto(editUrl, { timeout: 15000, waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  console.log('Edit page URL:', page.url());

  // Check for DeleteCourseButton in the JS source
  const jsContent = await page.evaluate(async () => {
    // Fetch the main JS bundle
    const scripts = document.querySelectorAll('script[type="module"]');
    const results = [];
    for (const s of scripts) {
      if (s.src) {
        try {
          const resp = await fetch(s.src);
          const text = await resp.text();
          const hasDelete =
            text.includes('delete-course-btn') ||
            text.includes('DeleteCourseButton');
          results.push({
            src: s.src.split('/').pop(),
            hasDeleteRef: hasDelete,
            size: text.length,
          });
        } catch (e) {
          results.push({ src: s.src, error: e.message });
        }
      }
    }
    return results;
  });
  console.log('\n=== JS Bundle analysis ===');
  console.log(JSON.stringify(jsContent, null, 2));

  // Check header area
  const headerButtons = await page.$$eval(
    '.flex.items-center.justify-between button, .flex.items-center.justify-between [data-testid]',
    (els) =>
      els.map((e) => ({
        tag: e.tagName,
        text: (e.textContent || '').trim().substring(0, 60),
        testid: e.getAttribute('data-testid'),
        ariaLabel: e.getAttribute('aria-label'),
      }))
  );
  console.log('\n=== Header buttons ===');
  console.log(JSON.stringify(headerButtons, null, 2));

  // Check the right side of header (where delete + publish should be)
  const rightSide = await page.evaluate(() => {
    const header = document.querySelector('.flex.items-center.justify-between');
    if (!header) return 'NO HEADER';
    // Get the last child (right side)
    const children = header.children;
    const lastChild = children[children.length - 1];
    return {
      tag: lastChild.tagName,
      classes: lastChild.className,
      innerHTML: lastChild.innerHTML.substring(0, 500),
      childCount: lastChild.children.length,
    };
  });
  console.log('\n=== Right side of header ===');
  console.log(JSON.stringify(rightSide, null, 2));

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'feat001-debug-editpage.png'),
    fullPage: false,
  });
  console.log('Screenshot saved');

  await ctx.close();
  await browser.close();
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

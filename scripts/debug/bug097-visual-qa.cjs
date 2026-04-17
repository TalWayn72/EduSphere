const {
  chromium,
} = require('C:/Users/P0039217/.claude/projects/EduSphere/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core');
const path = require('path');

const SCREENSHOTS_DIR =
  'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'he-IL',
  });
  const page = await context.newPage();

  // Set Hebrew locale
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });

  // Step 1: Go to login page
  console.log('=== Step 1: Navigate to /login ===');
  await page.goto('http://localhost:5173/login', { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('Login page URL:', page.url());
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'bug097-visual-01-login-page.png'),
  });

  // Step 2: Click the sign-in button which should redirect to Keycloak
  console.log('=== Step 2: Find and click sign-in ===');

  // List all interactive elements on login page
  const elements = await page.$$eval('button, a, input[type="submit"]', (els) =>
    els.map((e) => ({
      tag: e.tagName,
      type: e.getAttribute('type'),
      text: (e.textContent || '').trim().substring(0, 60),
      id: e.id,
      classes: e.className.substring(0, 80),
    }))
  );
  console.log('Login page elements:', JSON.stringify(elements, null, 2));

  // Try to find sign-in button
  const signInBtn = await page.$(
    'button:has-text("Sign In"), button:has-text("Login"), button:has-text("כניסה"), button:has-text("התחברות"), button[type="submit"]'
  );
  if (signInBtn) {
    const txt = await signInBtn.textContent();
    console.log('Clicking sign-in button:', txt.trim());
    await signInBtn.click();
    await page.waitForTimeout(5000);
    console.log('After sign-in click URL:', page.url());
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-visual-02-after-signin.png'),
    });
  } else {
    console.log('No sign-in button found, checking for form inputs...');
    // Maybe the login page has username/password fields directly
    const hasUsernameField = await page.$(
      'input[name="username"], input[type="email"], #username'
    );
    if (hasUsernameField) {
      console.log('Found username field on login page (direct form)');
    }
  }

  // Step 3: Handle Keycloak
  const url = page.url();
  console.log('=== Step 3: Check if on Keycloak ===');
  console.log('Current URL:', url);

  if (
    url.includes('8080') ||
    url.includes('keycloak') ||
    url.includes('realms')
  ) {
    console.log('On Keycloak login page');
    try {
      await page.waitForSelector('#username', { timeout: 10000 });
      await page.fill('#username', 'student@example.com');
      await page.fill('#password', 'Student123!');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-visual-03-kc-filled.png'),
      });

      // Click login
      await Promise.all([
        page.waitForNavigation({ timeout: 30000 }).catch(() => null),
        page.click('#kc-login'),
      ]);

      console.log('After KC submit URL:', page.url());
      await page.waitForTimeout(5000);
      console.log('After wait URL:', page.url());
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-visual-04-after-kc-login.png'),
      });
    } catch (e) {
      console.log('KC login error:', e.message);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-visual-03-kc-error.png'),
      });
    }
  } else {
    console.log('Not on Keycloak. Checking if already authenticated...');
    // Maybe the login page is a dev-mode page with a form
    const formInputs = await page.$$eval('input', (els) =>
      els.map((e) => ({
        name: e.name,
        type: e.type,
        id: e.id,
        placeholder: e.placeholder,
      }))
    );
    console.log('Form inputs:', JSON.stringify(formInputs));
  }

  // Re-set locale after any redirects
  await page.evaluate(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });

  // Check if we are now authenticated
  console.log('\n=== Auth status check ===');
  console.log('Current URL:', page.url());
  const isOnApp =
    page.url().includes('localhost:5173') && !page.url().includes('/login');
  console.log('On app (not login):', isOnApp);

  if (!isOnApp) {
    // Try navigating to dashboard directly - maybe we got cookies
    await page.goto('http://localhost:5173/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('Attempted dashboard, URL:', page.url());
  }

  // Whether authenticated or not, take screenshots of whatever we see
  const pages = [
    {
      name: 'dashboard',
      path: '/dashboard',
      file: 'bug097-visual-dashboard-he.png',
    },
    { name: 'social', path: '/social', file: 'bug097-visual-social-he.png' },
    {
      name: 'gamification',
      path: '/gamification',
      file: 'bug097-visual-gamification-he.png',
    },
    {
      name: 'settings',
      path: '/settings',
      file: 'bug097-visual-settings-he.png',
    },
  ];

  for (const pg of pages) {
    console.log('\n=== ' + pg.name + ' ===');
    try {
      await page.goto('http://localhost:5173' + pg.path, { timeout: 15000 });
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      console.log(pg.name + ' URL:', finalUrl);

      if (finalUrl.includes('/login') || finalUrl.includes('8080')) {
        console.log(pg.name + ': REDIRECTED - not authenticated');
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, pg.file) });

      // Get page info
      const info = await page.evaluate(() => ({
        dir: document.documentElement.getAttribute('dir'),
        lang: document.documentElement.getAttribute('lang'),
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim().substring(0, 80),
      }));
      console.log(pg.name + ' info:', JSON.stringify(info));
    } catch (e) {
      console.log(pg.name + ' error:', e.message);
    }
  }

  await browser.close();
  console.log('\n=== COMPLETE ===');
}

run().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

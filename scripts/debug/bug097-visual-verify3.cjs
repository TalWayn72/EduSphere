/**
 * BUG-097 Visual Verification V3 — Hebrew i18n / RTL layout
 * Fixed: wait for actual content, handle Keycloak properly, safe error recovery
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const USER = 'student@example.com';
const PASS = 'Student123!';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const ENGLISH_HEADINGS = [
  'Social Feed', 'My Progress', 'Gamification', 'Dashboard',
  'Settings', 'Welcome', 'Log In', 'Sign In', 'Courses',
  'Profile', 'Notifications', 'Leaderboard', 'Achievements',
];

const PAGES_AFTER_LOGIN = [
  { name: 'dashboard',    path: '/',              file: 'bug097-v3-dashboard-he.png' },
  { name: 'social',       path: '/social',        file: 'bug097-v3-social-he.png' },
  { name: 'gamification', path: '/gamification',  file: 'bug097-v3-gamification-he.png' },
  { name: 'progress',     path: '/progress',      file: 'bug097-v3-progress-he.png' },
  { name: 'settings',     path: '/settings',      file: 'bug097-v3-settings-he.png' },
];

async function waitForContent(page, timeout = 10000) {
  try {
    await page.waitForFunction(() => {
      const body = document.body;
      return body && body.innerText && body.innerText.trim().length > 5;
    }, { timeout });
  } catch {
    // Timeout - page may still be loading or truly empty
  }
}

async function checkPage(page, label, screenshotFile) {
  const result = { page: label, dir: null, lang: null, englishFound: [], ok: false };

  try {
    await waitForContent(page);

    result.dir = await page.evaluate(() => document.documentElement.dir || '(empty)');
    result.lang = await page.evaluate(() => document.documentElement.lang || '(empty)');

    const visibleText = await page.evaluate(() => {
      const selectors = 'h1, h2, h3, h4, h5, h6, button, a, [role="heading"], nav, [role="tab"], [role="menuitem"], label';
      const els = document.querySelectorAll(selectors);
      return Array.from(els).map(el => el.textContent?.trim()).filter(Boolean);
    });

    const bodySnippet = await page.evaluate(() => {
      return (document.body?.innerText || '').substring(0, 300);
    });

    for (const eng of ENGLISH_HEADINGS) {
      const found = visibleText.some(t => new RegExp('\\b' + eng + '\\b', 'i').test(t));
      if (found) result.englishFound.push(eng);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotFile), fullPage: true });

    result.ok = result.dir === 'rtl' && result.englishFound.length === 0;

    const dirStatus = result.dir === 'rtl' ? 'RTL OK' : 'DIR=' + result.dir + ' (NOT RTL!)';
    const engStatus = result.englishFound.length === 0
      ? 'No stale English'
      : 'ENGLISH FOUND: ' + result.englishFound.join(', ');

    console.log('  [' + label + '] dir=' + result.dir + ' lang=' + result.lang + ' | ' + dirStatus + ' | ' + engStatus);
    console.log('    -> Screenshot: ' + screenshotFile);
    if (bodySnippet.length < 20) {
      console.log('    -> WARN: Body text very short: "' + bodySnippet + '"');
    } else {
      console.log('    -> Body snippet: "' + bodySnippet.substring(0, 120) + '..."');
    }
  } catch (err) {
    console.log('  [' + label + '] ERROR: ' + err.message);
    result.englishFound.push('ERROR: ' + err.message);
  }

  return result;
}

(async () => {
  console.log('=== BUG-097 Hebrew i18n / RTL Visual Verification V3 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: {
      cookies: [],
      origins: [{
        origin: BASE,
        localStorage: [
          { name: 'edusphere_locale', value: 'he' }
        ]
      }]
    }
  });
  const page = await context.newPage();
  const results = [];

  try {
    // Step 1: Landing page
    console.log('Step 1: Landing page (Hebrew pre-set)...');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    results.push(await checkPage(page, 'landing', 'bug097-v3-landing-he.png'));

    // Step 2: Login page
    console.log('\nStep 2: Login page...');
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    results.push(await checkPage(page, 'login', 'bug097-v3-login-he.png'));

    // Step 3: Log in via Keycloak
    console.log('\nStep 3: Logging in as student...');
    const loginBtns = await page.locator('button, a').filter({ hasText: /sign.?in|כניסה|login|log.?in|התחברות/i }).all();
    console.log('  Found ' + loginBtns.length + ' sign-in buttons/links');

    let loggedIn = false;
    if (loginBtns.length > 0) {
      for (const btn of loginBtns) {
        const text = await btn.textContent().catch(() => '');
        const tag = await btn.evaluate(el => el.tagName).catch(() => '');
        console.log('    Button: <' + tag + '> "' + (text || '').trim() + '"');
      }
      try {
        await loginBtns[0].click({ timeout: 5000 });
        console.log('  Clicked first sign-in button, waiting...');
        await page.waitForTimeout(5000);
        console.log('  URL after click: ' + page.url());
      } catch (e) {
        console.log('  Click failed: ' + e.message);
      }
    }

    // Check if at Keycloak
    const currentUrl = page.url();
    if (currentUrl.includes('/realms/') || currentUrl.includes('keycloak')) {
      console.log('  At Keycloak login page');
      try {
        await page.locator('#username').fill(USER);
        await page.locator('#password').fill(PASS);
        await page.locator('#kc-login, [type="submit"]').click();
        await page.waitForURL(function(url) { return url.toString().startsWith(BASE); }, { timeout: 15000 });
        await page.waitForTimeout(3000);
        loggedIn = true;
        console.log('  Logged in! URL: ' + page.url());
      } catch (e) {
        console.log('  Keycloak login failed: ' + e.message);
      }
    } else if (currentUrl.startsWith('chrome-error')) {
      console.log('  Navigation error. Going back to app...');
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
    } else {
      console.log('  Not at Keycloak. URL: ' + currentUrl);
    }

    // Re-ensure Hebrew locale
    try {
      if (page.url().startsWith(BASE) || page.url().startsWith('http://localhost')) {
        await page.evaluate(function() {
          localStorage.removeItem('i18nextLng');
          localStorage.removeItem('i18next');
          localStorage.setItem('edusphere_locale', 'he');
        });
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('  Could not re-set locale: ' + e.message);
    }

    // Step 4: Check each page
    for (const pg of PAGES_AFTER_LOGIN) {
      console.log('\nStep 4: Checking ' + pg.name + ' (' + pg.path + ')...');
      try {
        await page.goto(BASE + pg.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2500);

        const pageUrl = page.url();
        if (pageUrl.includes('/login') && pg.path !== '/login') {
          console.log('  Redirected to login for ' + pg.name + ' (not authenticated)');
          // Still check the login page for Hebrew
          results.push(await checkPage(page, pg.name + ' (login-redirect)', pg.file));
          continue;
        }
        if (pageUrl.includes('/realms/')) {
          console.log('  Redirected to Keycloak for ' + pg.name);
          results.push({ page: pg.name, dir: 'N/A', lang: 'N/A', englishFound: ['REDIRECT_TO_KEYCLOAK'], ok: false });
          await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(1000);
          continue;
        }

        results.push(await checkPage(page, pg.name, pg.file));
      } catch (err) {
        console.log('  Error navigating to ' + pg.name + ': ' + err.message);
        results.push({ page: pg.name, dir: 'ERR', lang: 'ERR', englishFound: ['NAV_ERROR'], ok: false });
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(90));
    console.log('  BUG-097 VISUAL VERIFICATION RESULTS');
    console.log('='.repeat(90));
    var header = 'Page'.padEnd(25) + 'Dir'.padEnd(10) + 'Lang'.padEnd(8) + 'English Found'.padEnd(35) + 'Status';
    console.log(header);
    console.log('-'.repeat(90));

    let passCount = 0;
    let failCount = 0;
    for (const r of results) {
      const dirStr = (r.dir || 'N/A').padEnd(10);
      const langStr = (r.lang || 'N/A').padEnd(8);
      const engStr = (r.englishFound.length > 0 ? r.englishFound.join(', ') : 'None').padEnd(35);
      const status = r.ok ? 'PASS' : 'FAIL';
      if (r.ok) passCount++; else failCount++;
      console.log(r.page.padEnd(25) + dirStr + langStr + engStr + status);
    }

    console.log('-'.repeat(90));
    console.log('PASS: ' + passCount + ' | FAIL: ' + failCount + ' | TOTAL: ' + results.length);
    console.log(passCount === results.length ? '\nOVERALL: ALL PAGES PASS' : '\nOVERALL: SOME PAGES FAILED');
    console.log('\nScreenshots saved to: ' + SCREENSHOTS_DIR);

  } catch (err) {
    console.error('FATAL ERROR: ' + err.message);
    console.error(err.stack);
    try {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug097-v3-ERROR.png') });
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();

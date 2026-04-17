/**
 * BUG-097 Visual Verification V2 — Hebrew i18n / RTL layout
 * Fixed: localStorage access timing issue
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const USER = 'student@example.com';
const PASS = 'Student123!';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');

const ENGLISH_HEADINGS = [
  'Social Feed',
  'My Progress',
  'Gamification',
  'Dashboard',
  'Settings',
  'Welcome',
  'Log In',
  'Sign In',
  'Courses',
  'Profile',
  'Notifications',
  'Leaderboard',
  'Achievements',
];

const PAGES_AFTER_LOGIN = [
  { name: 'dashboard', path: '/', file: 'bug097-v2-dashboard-he.png' },
  { name: 'social', path: '/social', file: 'bug097-v2-social-he.png' },
  {
    name: 'gamification',
    path: '/gamification',
    file: 'bug097-v2-gamification-he.png',
  },
  { name: 'progress', path: '/progress', file: 'bug097-v2-progress-he.png' },
  { name: 'settings', path: '/settings', file: 'bug097-v2-settings-he.png' },
];

async function checkPage(page, label, screenshotFile) {
  const result = {
    page: label,
    dir: null,
    lang: null,
    englishFound: [],
    ok: false,
  };

  result.dir = await page.evaluate(() => document.documentElement.dir);
  result.lang = await page.evaluate(() => document.documentElement.lang);

  const visibleText = await page.evaluate(() => {
    const selectors =
      'h1, h2, h3, h4, h5, h6, button, a, [role="heading"], nav, [role="tab"], [role="menuitem"], label';
    const els = document.querySelectorAll(selectors);
    return Array.from(els)
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
  });

  for (const eng of ENGLISH_HEADINGS) {
    const found = visibleText.some((t) => {
      const re = new RegExp(`\b${eng}\b`, 'i');
      return re.test(t);
    });
    if (found) result.englishFound.push(eng);
  }

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, screenshotFile),
    fullPage: true,
  });

  result.ok = result.dir === 'rtl' && result.englishFound.length === 0;

  const dirStatus =
    result.dir === 'rtl' ? 'RTL OK' : `DIR=${result.dir} (NOT RTL!)`;
  const engStatus =
    result.englishFound.length === 0
      ? 'No stale English'
      : `ENGLISH FOUND: ${result.englishFound.join(', ')}`;

  console.log(
    `  [${label}] dir=${result.dir} lang=${result.lang} | ${dirStatus} | ${engStatus}`
  );
  console.log(`    -> Screenshot: ${screenshotFile}`);

  return result;
}

(async () => {
  console.log('=== BUG-097 Hebrew i18n / RTL Visual Verification V2 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [{ name: 'edusphere_locale', value: 'he' }],
        },
      ],
    },
  });
  const page = await context.newPage();
  const results = [];

  try {
    // ── Step 1: Landing page with Hebrew pre-set ────────────────────────
    console.log(
      'Step 1: Landing page with Hebrew locale pre-set via storageState...'
    );
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    results.push(await checkPage(page, 'landing', 'bug097-v2-landing-he.png'));

    // ── Step 2: Login page ──────────────────────────────────────────────
    console.log('\nStep 2: Login page...');
    await page.goto(`${BASE}/login`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForTimeout(1500);
    results.push(await checkPage(page, 'login', 'bug097-v2-login-he.png'));

    // ── Step 3: Log in via Keycloak ─────────────────────────────────────
    console.log('\nStep 3: Logging in as student...');
    const signInBtn = page
      .locator(
        'button:has-text("Sign In"), button:has-text("כניסה"), a:has-text("Sign In"), a:has-text("כניסה")'
      )
      .first();
    try {
      await signInBtn.click({ timeout: 5000 });
    } catch {
      console.log(
        '  No sign-in button found on login page, trying direct Keycloak...'
      );
    }

    const kcRedirect = await page
      .waitForURL('**/realms/**', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (kcRedirect || page.url().includes('/realms/')) {
      console.log('  At Keycloak login form...');
      await page.locator('#username').fill(USER);
      await page.locator('#password').fill(PASS);
      await page.locator('#kc-login, [type="submit"]').click();
      await page.waitForURL(`${BASE}/**`, { timeout: 15000 });
      await page.waitForTimeout(3000);
      console.log('  Logged in. URL:', page.url());
    } else {
      console.log('  Could not reach Keycloak. URL:', page.url());
    }

    // Re-ensure Hebrew locale after login
    await page.evaluate(() => {
      localStorage.removeItem('i18nextLng');
      localStorage.removeItem('i18next');
      localStorage.setItem('edusphere_locale', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // ── Step 4: Check each authenticated page ───────────────────────────
    for (const pg of PAGES_AFTER_LOGIN) {
      console.log(`\nStep 4: Checking ${pg.name} (${pg.path})...`);
      await page.goto(`${BASE}${pg.path}`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      if (page.url().includes('/login') || page.url().includes('/realms/')) {
        console.log(`  WARN: Redirected to login for ${pg.name}`);
        results.push({
          page: pg.name,
          dir: 'N/A',
          lang: 'N/A',
          englishFound: ['REDIRECT_TO_LOGIN'],
          ok: false,
        });
        continue;
      }

      results.push(await checkPage(page, pg.name, pg.file));
    }

    // ── Summary ─────────────────────────────────────────────────────────
    console.log('\n\n=== RESULTS TABLE ===');
    console.log('='.repeat(80));
    console.log(
      `${'Page'.padEnd(15)} ${'Dir'.padEnd(6)} ${'Lang'.padEnd(6)} ${'English Found'.padEnd(35)} Status`
    );
    console.log('-'.repeat(80));

    let allOk = true;
    for (const r of results) {
      const dirStr = (r.dir || 'N/A').padEnd(6);
      const langStr = (r.lang || 'N/A').padEnd(6);
      const engStr = (
        r.englishFound.length > 0 ? r.englishFound.join(', ') : 'None'
      ).padEnd(35);
      const status = r.ok ? 'PASS' : 'FAIL';
      if (!r.ok) allOk = false;
      console.log(
        `${r.page.padEnd(15)} ${dirStr} ${langStr} ${engStr} ${status}`
      );
    }

    console.log('='.repeat(80));
    console.log(
      allOk
        ? '\nOVERALL: ALL PAGES PASS'
        : '\nOVERALL: SOME PAGES FAILED — see details above'
    );
    console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    console.error(err.stack);
    await page
      .screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug097-v2-ERROR.png') })
      .catch(() => {});
  } finally {
    await browser.close();
  }
})();

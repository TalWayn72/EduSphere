/**
 * BUG-097 Visual Verification — Hebrew i18n / RTL layout (comprehensive)
 * Checks every major page for:
 *   1. document.documentElement.dir === 'rtl'
 *   2. No stale English headings that should be translated
 *   3. Screenshots for visual inspection
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5174';
const USER = 'student@example.com';
const PASS = 'Student123!';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');
const CACHE_BUST = `t=${Date.now()}`;

// English strings that should NOT appear if Hebrew is active
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
  { name: 'dashboard',    path: '/',              file: 'bug097-verify-dashboard-he.png' },
  { name: 'social',       path: '/social',        file: 'bug097-verify-social-he.png' },
  { name: 'gamification', path: '/gamification',  file: 'bug097-verify-gamification-he.png' },
  { name: 'progress',     path: '/progress',      file: 'bug097-verify-progress-he.png' },
  { name: 'settings',     path: '/settings',      file: 'bug097-verify-settings-he.png' },
];

async function checkPage(page, label, screenshotFile) {
  const result = { page: label, dir: null, englishFound: [], ok: false };

  // Check dir attribute
  result.dir = await page.evaluate(() => document.documentElement.dir);

  // Check lang attribute
  const lang = await page.evaluate(() => document.documentElement.lang);

  // Grab visible text from headings, buttons, nav links
  const visibleText = await page.evaluate(() => {
    const selectors = 'h1, h2, h3, h4, h5, h6, button, a, [role="heading"], nav, [role="tab"], [role="menuitem"], label';
    const els = document.querySelectorAll(selectors);
    return Array.from(els).map(el => el.textContent?.trim()).filter(Boolean);
  });

  // Check for English headings that should be in Hebrew
  for (const eng of ENGLISH_HEADINGS) {
    const found = visibleText.some(t => {
      const re = new RegExp(`\\b${eng}\\b`, 'i');
      return re.test(t);
    });
    if (found) result.englishFound.push(eng);
  }

  // Screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotFile), fullPage: true });

  result.ok = result.dir === 'rtl' && result.englishFound.length === 0;

  const dirStatus = result.dir === 'rtl' ? 'RTL OK' : `DIR=${result.dir} (NOT RTL!)`;
  const engStatus = result.englishFound.length === 0
    ? 'No stale English'
    : `ENGLISH FOUND: ${result.englishFound.join(', ')}`;

  console.log(`  [${label}] dir=${result.dir} lang=${lang} | ${dirStatus} | ${engStatus}`);
  console.log(`    -> Screenshot: ${screenshotFile}`);

  return result;
}

(async () => {
  console.log('=== BUG-097 Hebrew i18n / RTL Visual Verification ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const results = [];

  try {
    // ── Step 1: Landing page (before setting Hebrew) ──────────────────────
    console.log('Step 1: Landing page (default locale)...');
    await page.goto(`${BASE}?${CACHE_BUST}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // ── Step 2: Switch to Hebrew via localStorage ─────────────────────────
    console.log('Step 2: Setting locale to Hebrew (he)...');
    await page.evaluate(() => {
      // The app uses 'edusphere_locale' as the ONLY localStorage key for locale
      // detection (configured via lookupLocalStorage in i18n.ts).
      // Remove stale default i18next keys that could interfere.
      localStorage.removeItem('i18nextLng');
      localStorage.removeItem('i18next');
      localStorage.setItem('edusphere_locale', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // ── Step 3: Landing page in Hebrew ────────────────────────────────────
    console.log('\nStep 3: Checking landing page in Hebrew...');
    results.push(await checkPage(page, 'landing', 'bug097-verify-landing-he.png'));

    // ── Step 4: Login page ────────────────────────────────────────────────
    console.log('\nStep 4: Navigating to login page...');
    await page.goto(`${BASE}/login?${CACHE_BUST}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    results.push(await checkPage(page, 'login', 'bug097-verify-login-he.png'));

    // ── Step 5: Log in via Keycloak ───────────────────────────────────────
    console.log('\nStep 5: Logging in as student...');
    // Click sign-in button to go to Keycloak
    const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("כניסה"), a:has-text("Sign In"), a:has-text("כניסה")').first();
    try {
      await signInBtn.click({ timeout: 5000 });
    } catch {
      console.log('  No sign-in button found, checking if already at Keycloak...');
    }

    // Wait for Keycloak redirect
    await page.waitForURL('**/realms/**', { timeout: 10000 }).catch(() => {
      console.log('  No Keycloak redirect detected, trying direct login...');
    });

    if (page.url().includes('/realms/')) {
      await page.locator('#username').fill(USER);
      await page.locator('#password').fill(PASS);
      await page.locator('#kc-login, [type="submit"]').click();
      await page.waitForURL(`${BASE}/**`, { timeout: 15000 });
      await page.waitForTimeout(3000);
      console.log('  Logged in, URL:', page.url());
    } else {
      console.log('  Could not reach Keycloak login. URL:', page.url());
    }

    // Re-set Hebrew locale after login (in case login cleared storage)
    await page.evaluate(() => {
      localStorage.removeItem('i18nextLng');
      localStorage.removeItem('i18next');
      localStorage.setItem('edusphere_locale', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // ── Step 6: Check each authenticated page ─────────────────────────────
    for (const pg of PAGES_AFTER_LOGIN) {
      console.log(`\nStep 6: Checking ${pg.name} (${pg.path})...`);
      const sep = pg.path.includes('?') ? '&' : '?';
      await page.goto(`${BASE}${pg.path}${sep}${CACHE_BUST}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);

      // Check if we got redirected to login (session expired)
      if (page.url().includes('/login') || page.url().includes('/realms/')) {
        console.log(`  WARN: Redirected to login for ${pg.name}, skipping...`);
        results.push({ page: pg.name, dir: 'N/A', englishFound: ['REDIRECT_TO_LOGIN'], ok: false });
        continue;
      }

      results.push(await checkPage(page, pg.name, pg.file));
    }

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n\n=== SUMMARY ===');
    console.log('-'.repeat(70));
    console.log(`${'Page'.padEnd(15)} ${'Dir'.padEnd(6)} ${'English Found'.padEnd(35)} Status`);
    console.log('-'.repeat(70));

    let allOk = true;
    for (const r of results) {
      const dirStr = (r.dir || 'N/A').padEnd(6);
      const engStr = (r.englishFound.length > 0 ? r.englishFound.join(', ') : 'None').padEnd(35);
      const status = r.ok ? 'PASS' : 'FAIL';
      if (!r.ok) allOk = false;
      console.log(`${r.page.padEnd(15)} ${dirStr} ${engStr} ${status}`);
    }

    console.log('-'.repeat(70));
    console.log(allOk ? '\nOVERALL: ALL PAGES PASS' : '\nOVERALL: SOME PAGES FAILED — see details above');
    console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug097-verify-ERROR.png') });
  } finally {
    await browser.close();
  }
})();

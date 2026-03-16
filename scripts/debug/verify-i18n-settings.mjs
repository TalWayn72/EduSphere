/**
 * Visual verification script for i18n settings page fix.
 * Authenticates via Keycloak, navigates to /settings, takes screenshots
 * in English and Hebrew, and reports what text is visible.
 */
import { chromium } from 'playwright';
import { join } from 'path';

const SCREENSHOTS_DIR = join(import.meta.dirname, '..', '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Step 0: Authenticate via Keycloak
    console.log('=== Step 0: Authenticating via Keycloak ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click Sign In with Keycloak button
    console.log('  Looking for Sign In button...');
    const signInBtn = page.getByText('Sign In with Keycloak');
    await signInBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  Found Sign In button, clicking...');

    // Use Promise.all to handle navigation + click together
    await Promise.all([
      page.waitForURL('**/realms/**', { timeout: 15000 }).catch(() => {}),
      signInBtn.click(),
    ]);

    await page.waitForTimeout(2000);
    let currentUrl = page.url();
    console.log(`  After click URL: ${currentUrl}`);

    // Check if we're on Keycloak login page
    if (currentUrl.includes('8080') || currentUrl.includes('realms')) {
      console.log('  On Keycloak login page, filling credentials...');

      // Wait for the login form
      await page.waitForSelector('#username, input[name="username"]', { timeout: 10000 });

      await page.fill('#username', 'instructor@example.com');
      await page.fill('#password', 'Instructor123!');

      await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-keycloak-form.png') });
      console.log('  Credentials entered, submitting...');

      // Submit and wait for redirect back to app
      await Promise.all([
        page.waitForURL(`${BASE_URL}/**`, { timeout: 30000 }).catch(() =>
          page.waitForURL(BASE_URL, { timeout: 10000 }).catch(() => {})
        ),
        page.click('#kc-login, input[type="submit"]'),
      ]);

      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle').catch(() => {});

      currentUrl = page.url();
      console.log(`  After Keycloak login URL: ${currentUrl}`);
    }

    // Take post-login screenshot
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-after-login.png') });
    const bodyAfterLogin = (await page.textContent('body')).replace(/\{[^}]*"@context"[^}]*\}/g, '').trim();
    console.log(`  Post-login page text: ${bodyAfterLogin.slice(0, 300)}`);

    // Verify we're authenticated (no login page showing)
    const stillOnLogin = bodyAfterLogin.includes('Sign In with Keycloak') && !bodyAfterLogin.includes('Dashboard');
    if (stillOnLogin) {
      console.log('  WARNING: Still on login page after auth attempt');
    } else {
      console.log('  GOOD: Authenticated successfully');
    }

    // Step 1: Navigate to settings page
    console.log('\n=== Step 1: Navigating to /settings ===');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const settingsUrl = page.url();
    console.log(`  URL: ${settingsUrl}`);

    if (settingsUrl.includes('login') || settingsUrl.includes('8080')) {
      console.log('  ERROR: Redirected to login - auth session lost');
      await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-auth-failed.png'), fullPage: true });

      // Show what's on the page
      const txt = (await page.textContent('body')).replace(/\{[^}]*"@context"[^}]*\}/g, '').trim();
      console.log(`  Page: ${txt.slice(0, 500)}`);
      console.log('\n=== VERIFICATION FAILED: Could not authenticate ===');
      return;
    }

    // Step 2: Screenshot English settings page
    console.log('\n=== Step 2: Taking English screenshot ===');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-english-after-fix.png'), fullPage: true });

    const bodyText = (await page.textContent('body')).replace(/\{[^}]*"@context"[^}]*\}/g, '').trim();
    console.log('\n--- English Page Text Analysis ---');

    const badKeys = ['language.title', 'storage.title', 'settings.title', 'appearance.title',
                     'content.settings.', 'content:settings.'];
    const goodEnglish = ['Settings', 'Language', 'Storage', 'Appearance', 'Profile', 'Theme',
                         'Offline', 'Notifications', 'Dark', 'Light'];

    let hasRawKeys = false;
    for (const key of badKeys) {
      if (bodyText.includes(key)) {
        console.log(`  BAD: Raw translation key found: "${key}"`);
        hasRawKeys = true;
      }
    }
    if (!hasRawKeys) {
      console.log('  GOOD: No raw translation keys visible');
    }

    for (const text of goodEnglish) {
      if (bodyText.includes(text)) {
        console.log(`  FOUND: "${text}"`);
      } else {
        console.log(`  MISSING: "${text}" not found on page`);
      }
    }

    console.log('\n--- Page text (first 2000 chars) ---');
    console.log(bodyText.slice(0, 2000));

    // Step 3: Switch to Hebrew
    console.log('\n=== Step 3: Switching to Hebrew ===');
    let switched = false;

    // Strategy A: <select> element
    const selects = await page.locator('select').all();
    console.log(`  Found ${selects.length} <select> elements`);
    for (const sel of selects) {
      const options = await sel.locator('option').allTextContents();
      console.log(`    Options: ${JSON.stringify(options)}`);
      if (options.some(o => o.includes('עברית') || o.includes('Hebrew'))) {
        await sel.selectOption({ label: 'עברית' }).catch(async () => {
          await sel.selectOption({ value: 'he' }).catch(() => {});
        });
        switched = true;
        console.log('  Switched via <select>');
        break;
      }
    }

    // Strategy B: Radix Select
    if (!switched) {
      const triggers = await page.locator('[role="combobox"], [data-radix-select-trigger], button[aria-haspopup="listbox"]').all();
      console.log(`  Found ${triggers.length} combobox/select triggers`);
      for (const trigger of triggers) {
        const text = await trigger.textContent().catch(() => '');
        console.log(`    Trigger text: "${text.trim().slice(0, 80)}"`);
        // Click each trigger and check for language options
        await trigger.click();
        await page.waitForTimeout(500);
        const heOption = page.locator('[role="option"]:has-text("עברית"), [role="option"]:has-text("Hebrew")').first();
        if (await heOption.isVisible().catch(() => false)) {
          await heOption.click();
          switched = true;
          console.log('  Switched via Radix Select');
          break;
        }
        // Close the dropdown if no Hebrew option
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }

    // Strategy C: List all interactive elements
    if (!switched) {
      console.log('  Listing interactive elements:');
      const allBtns = await page.locator('button, [role="combobox"], select, [role="switch"]').all();
      for (let i = 0; i < Math.min(allBtns.length, 40); i++) {
        const tag = await allBtns[i].evaluate(el => el.tagName).catch(() => '?');
        const text = (await allBtns[i].textContent().catch(() => '')).trim().slice(0, 80);
        const role = await allBtns[i].getAttribute('role').catch(() => null);
        const ariaLabel = await allBtns[i].getAttribute('aria-label').catch(() => null);
        console.log(`    [${i}] <${tag}> role="${role}" aria-label="${ariaLabel}" text="${text}"`);
      }
    }

    // Strategy D: Use i18n API directly
    if (!switched) {
      console.log('  Trying i18n API via page.evaluate...');
      const result = await page.evaluate(async () => {
        const w = window;
        for (const key of ['i18next', '__i18n', 'i18n']) {
          if (w[key] && typeof w[key].changeLanguage === 'function') {
            await w[key].changeLanguage('he');
            return `switched via window.${key}`;
          }
        }
        localStorage.setItem('i18nextLng', 'he');
        return 'set localStorage, need reload';
      }).catch(e => `failed: ${e.message}`);
      console.log(`  i18n API result: ${result}`);

      if (result.includes('switched')) {
        switched = true;
      } else {
        await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(2000);
        switched = true;
      }
    }

    // Step 4: Wait for translations
    console.log('\n=== Step 4: Waiting for translations ===');
    await page.waitForTimeout(3000);

    // Step 5: Screenshot Hebrew
    console.log('\n=== Step 5: Taking Hebrew screenshot ===');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-hebrew-after-fix.png'), fullPage: true });

    const hebrewBody = (await page.textContent('body')).replace(/\{[^}]*"@context"[^}]*\}/g, '').trim();
    console.log('\n--- Hebrew Page Text Analysis ---');

    const goodHebrew = ['הגדרות', 'שפה', 'אחסון לא מקוון', 'אחסון', 'מראה', 'פרופיל', 'ערכת נושא',
                        'התראות', 'כהה', 'בהיר'];
    for (const text of goodHebrew) {
      if (hebrewBody.includes(text)) {
        console.log(`  FOUND: "${text}"`);
      } else {
        console.log(`  MISSING: "${text}"`);
      }
    }

    for (const key of badKeys) {
      if (hebrewBody.includes(key)) {
        console.log(`  BAD: Raw key: "${key}"`);
      }
    }

    console.log('\n--- Hebrew page text (first 2000 chars) ---');
    console.log(hebrewBody.slice(0, 2000));

    // Step 6: Check RTL
    console.log('\n=== Step 6: Checking RTL direction ===');
    const htmlDir = await page.getAttribute('html', 'dir');
    const htmlLang = await page.getAttribute('html', 'lang');
    const bodyDir = await page.evaluate(() => getComputedStyle(document.body).direction);
    console.log(`  html dir="${htmlDir}" lang="${htmlLang}"`);
    console.log(`  body computed direction: "${bodyDir}"`);
    console.log(bodyDir === 'rtl' || htmlDir === 'rtl' ? '  GOOD: RTL' : '  BAD: NOT RTL');

    // Step 7: Switch back to English
    console.log('\n=== Step 7: Switching back to English ===');
    // Try select
    const selects2 = await page.locator('select').all();
    let switchedBack = false;
    for (const sel of selects2) {
      const opts = await sel.locator('option').allTextContents();
      if (opts.some(o => o.includes('English') || o.includes('אנגלית'))) {
        await sel.selectOption({ value: 'en' }).catch(() => {});
        switchedBack = true;
        break;
      }
    }

    if (!switchedBack) {
      // Radix select triggers
      const triggers2 = await page.locator('[role="combobox"]').all();
      for (const t of triggers2) {
        await t.click();
        await page.waitForTimeout(500);
        const enOpt = page.locator('[role="option"]:has-text("English"), [role="option"]:has-text("אנגלית")').first();
        if (await enOpt.isVisible().catch(() => false)) {
          await enOpt.click();
          switchedBack = true;
          break;
        }
        await page.keyboard.press('Escape');
      }
    }

    if (!switchedBack) {
      await page.evaluate(async () => {
        const w = window;
        for (const key of ['i18next', '__i18n', 'i18n']) {
          if (w[key] && typeof w[key].changeLanguage === 'function') {
            await w[key].changeLanguage('en');
            return;
          }
        }
        localStorage.setItem('i18nextLng', 'en');
      }).catch(() => {});
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    }

    await page.waitForTimeout(3000);

    // Step 8: Screenshot English again
    console.log('\n=== Step 8: Taking final English screenshot ===');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-back-to-english.png'), fullPage: true });

    const finalBody = (await page.textContent('body')).replace(/\{[^}]*"@context"[^}]*\}/g, '').trim();
    console.log('\n--- Final English Text Analysis ---');
    for (const text of goodEnglish) {
      if (finalBody.includes(text)) {
        console.log(`  FOUND: "${text}"`);
      } else {
        console.log(`  MISSING: "${text}"`);
      }
    }

    const finalDir = await page.evaluate(() => getComputedStyle(document.body).direction);
    console.log(`  Direction: "${finalDir}"`);

    console.log('\n=== VERIFICATION COMPLETE ===');

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'settings-error.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();

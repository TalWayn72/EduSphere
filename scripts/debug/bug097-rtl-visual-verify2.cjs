/**
 * BUG-097 Visual QA Round 2: Hebrew/RTL layout verification with Keycloak login
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'he-IL',
  });
  const page = await context.newPage();

  const results = [];
  function report(step, status, details) {
    const entry = `[${step}] ${status}: ${details}`;
    results.push(entry);
    console.log(entry);
  }

  try {
    // Step 1: Navigate to landing page
    console.log('--- Step 1: Landing page ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Set Hebrew locale
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    report(
      'Landing RTL',
      htmlDir === 'rtl' ? 'PASS' : 'FAIL',
      `dir="${htmlDir}" lang="${htmlLang}"`
    );

    // Capture landing page in Hebrew
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-01-landing-he.png'),
      fullPage: false,
    });

    // Check landing page Hebrew text
    const landingText = await page.evaluate(() => document.body.innerText);
    const hasHebrew =
      landingText.includes('ברוכים הבאים') || landingText.includes('כניסה');
    report(
      'Landing Hebrew',
      hasHebrew ? 'PASS' : 'FAIL',
      `Hebrew text present: ${hasHebrew}`
    );

    // Step 2: Login via Keycloak
    console.log('--- Step 2: Keycloak Login ---');
    // Click the Keycloak login button
    const kcButton = await page.$(
      'button:has-text("Keycloak"), a:has-text("Keycloak"), button:has-text("כניסה עם Keycloak")'
    );
    if (kcButton) {
      await kcButton.click();
      report('Login', 'INFO', 'Clicked Keycloak login button');
    } else {
      // Try any login button
      const anyLogin = await page.$(
        'button:has-text("Log In"), button:has-text("Sign In"), a:has-text("Log In")'
      );
      if (anyLogin) {
        await anyLogin.click();
        report('Login', 'INFO', 'Clicked generic login button');
      }
    }
    await sleep(5000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-02-keycloak.png'),
      fullPage: false,
    });

    const loginUrl = page.url();
    report('Login', 'INFO', `Login URL: ${loginUrl}`);

    // Fill Keycloak form
    if (
      loginUrl.includes('keycloak') ||
      loginUrl.includes('auth') ||
      loginUrl.includes('8080')
    ) {
      const usernameField = await page.$('#username, input[name="username"]');
      const passwordField = await page.$('#password, input[name="password"]');
      if (usernameField && passwordField) {
        await usernameField.fill('student@example.com');
        await passwordField.fill('Student123!');
        report('Login', 'INFO', 'Filled credentials');

        const submitBtn = await page.$(
          '#kc-login, button[type="submit"], input[type="submit"]'
        );
        if (submitBtn) {
          await submitBtn.click();
          report('Login', 'INFO', 'Submitted login form');
        }
        await sleep(8000);
      }
    } else {
      report('Login', 'WARN', 'Not on Keycloak page');
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-03-after-login.png'),
      fullPage: false,
    });
    report('Login', 'INFO', `After login URL: ${page.url()}`);

    // Handle consent dialog if present
    await sleep(2000);
    const consentBtn = await page.$(
      'button:has-text("Accept"), button:has-text("אישור"), button:has-text("I Agree"), [data-testid="consent-accept"]'
    );
    if (consentBtn) {
      await consentBtn.click();
      await sleep(2000);
      report('Consent', 'INFO', 'Accepted consent dialog');
    }

    // Re-set Hebrew locale after login (may have been cleared)
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    // Step 3: Check current page (should be dashboard or home after login)
    console.log('--- Step 3: Post-login page ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-04-home-he.png'),
      fullPage: false,
    });

    const postLoginDir = await page.evaluate(
      () => document.documentElement.dir
    );
    report(
      'Post-Login RTL',
      postLoginDir === 'rtl' ? 'PASS' : 'FAIL',
      `dir="${postLoginDir}"`
    );

    const postLoginText = await page.evaluate(() =>
      document.body.innerText.substring(0, 800)
    );
    report('Post-Login Content', 'INFO', `First 800 chars:\n${postLoginText}`);

    // Check sidebar position
    const sidebarCheck = await page.evaluate(() => {
      const sidebar = document.querySelector(
        'aside, nav:not([role="menubar"]), [class*="sidebar"], [class*="Sidebar"]'
      );
      if (!sidebar) return 'no sidebar element found';
      const rect = sidebar.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const position =
        rect.left > windowWidth / 2 ? 'RIGHT (correct for RTL)' : 'LEFT';
      return `sidebar: left=${Math.round(rect.left)} right=${Math.round(rect.right)} width=${Math.round(rect.width)} window=${windowWidth} → ${position}`;
    });
    report('Sidebar Position', 'INFO', sidebarCheck);

    // Step 4: Navigate to social feed
    console.log('--- Step 4: Social Feed ---');
    await page.goto(`${BASE_URL}/social`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-social-he.png'),
      fullPage: false,
    });

    const socialText = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      return headings.map((h) => h.textContent.trim()).join(' | ');
    });
    report('Social Headings', 'INFO', socialText || 'no headings found');

    // Step 5: Navigate to dashboard
    console.log('--- Step 5: Dashboard ---');
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-dashboard-he.png'),
      fullPage: false,
    });

    const dashText = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      return headings.map((h) => h.textContent.trim()).join(' | ');
    });
    report('Dashboard Headings', 'INFO', dashText || 'no headings found');

    // Step 6: Navigate to settings
    console.log('--- Step 6: Settings ---');
    await page.goto(`${BASE_URL}/settings`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-settings-he.png'),
      fullPage: false,
    });

    const settingsInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      const hasHebrew = /[\u0590-\u05FF]/.test(allText);
      const selectEls = document.querySelectorAll('select, [role="combobox"]');
      const selectInfo = Array.from(selectEls).map(
        (s) =>
          `${s.tagName}:value="${s.value || s.textContent?.trim().substring(0, 30)}"`
      );
      return {
        hasHebrew,
        selects: selectInfo,
        textSample: allText.substring(0, 400),
      };
    });
    report('Settings', 'INFO', JSON.stringify(settingsInfo, null, 2));

    // Step 7: Navigate to gamification
    console.log('--- Step 7: Gamification ---');
    await page.goto(`${BASE_URL}/gamification`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-gamification-he.png'),
      fullPage: false,
    });

    const gamInfo = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(
        (h) => h.textContent.trim()
      );
      const tabs = Array.from(
        document.querySelectorAll('[role="tab"], button[data-state]')
      ).map((t) => t.textContent.trim());
      const hasHebrew = /[\u0590-\u05FF]/.test(document.body.innerText);
      return { headings, tabs, hasHebrew };
    });
    report('Gamification', 'INFO', JSON.stringify(gamInfo, null, 2));

    // Step 8: Navigate to courses
    console.log('--- Step 8: Courses ---');
    await page.goto(`${BASE_URL}/courses`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(3000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-courses-he.png'),
      fullPage: false,
    });

    const coursesInfo = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(
        (h) => h.textContent.trim()
      );
      const hasHebrew = /[\u0590-\u05FF]/.test(document.body.innerText);
      return { headings, hasHebrew };
    });
    report('Courses', 'INFO', JSON.stringify(coursesInfo, null, 2));

    // Step 9: Full-page final screenshot
    console.log('--- Step 9: Final ---');
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-final.png'),
      fullPage: true,
    });

    // Comprehensive RTL/Hebrew analysis
    const finalAnalysis = await page.evaluate(() => {
      const html = document.documentElement;
      // Find all text nodes and check Hebrew vs English ratio
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let hebrewCount = 0;
      let englishCount = 0;
      let mixedTexts = [];
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        if (text.length < 2) continue;
        const hasHeb = /[\u0590-\u05FF]/.test(text);
        const hasEng = /[a-zA-Z]{3,}/.test(text);
        if (hasHeb) hebrewCount++;
        if (hasEng && !hasHeb) {
          englishCount++;
          if (text.length > 3 && text.length < 50) {
            mixedTexts.push(text);
          }
        }
      }
      return {
        htmlDir: html.dir,
        htmlLang: html.lang,
        hebrewTextNodes: hebrewCount,
        englishOnlyNodes: englishCount,
        sampleEnglishTexts: mixedTexts.slice(0, 20),
      };
    });
    report('Final Analysis', 'INFO', JSON.stringify(finalAnalysis, null, 2));
  } catch (err) {
    report('Error', 'FAIL', err.message);
    console.error(err.stack);
    await page
      .screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-error.png'),
        fullPage: false,
      })
      .catch(() => {});
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n========== VISUAL QA SUMMARY ==========');
  const passes = results.filter((r) => r.includes('PASS')).length;
  const fails = results.filter((r) => r.includes('FAIL')).length;
  const warns = results.filter((r) => r.includes('WARN')).length;
  console.log(`PASS: ${passes} | FAIL: ${fails} | WARN: ${warns}`);
  console.log('');
  for (const r of results) {
    console.log(r);
  }
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

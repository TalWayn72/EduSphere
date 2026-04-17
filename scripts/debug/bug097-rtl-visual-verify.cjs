/**
 * BUG-097 Visual QA: Hebrew/RTL layout verification
 * Uses Playwright to navigate through key pages and capture screenshots.
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
  // Ensure screenshots dir exists
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
    // Step 1: Navigate to app
    console.log('--- Step 1: Navigate to app ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-01-landing.png'),
      fullPage: false,
    });
    report('Landing', 'OK', 'Page loaded');

    // Step 2: Set Hebrew locale in localStorage
    console.log('--- Step 2: Set Hebrew locale ---');
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-02-after-locale.png'),
      fullPage: false,
    });

    // Check dir attribute
    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    report(
      'Locale',
      htmlDir === 'rtl' ? 'PASS' : 'FAIL',
      `dir="${htmlDir}" lang="${htmlLang}"`
    );

    // Step 3: Try to log in
    console.log('--- Step 3: Login ---');
    // Look for login elements
    const loginButton = await page.$(
      'button:has-text("Login"), button:has-text("כניסה"), a:has-text("Login"), a:has-text("כניסה"), [data-testid="login-button"]'
    );
    if (loginButton) {
      await loginButton.click();
      await sleep(3000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-03-login-page.png'),
        fullPage: false,
      });

      // Check if we're on Keycloak or local login
      const url = page.url();
      report('Login', 'INFO', `Current URL after login click: ${url}`);

      if (url.includes('keycloak') || url.includes('auth')) {
        // Keycloak login
        const usernameField = await page.$('#username, input[name="username"]');
        const passwordField = await page.$('#password, input[name="password"]');
        if (usernameField && passwordField) {
          await usernameField.fill('student@example.com');
          await passwordField.fill('Student123!');
          const submitBtn = await page.$('#kc-login, button[type="submit"]');
          if (submitBtn) await submitBtn.click();
          await sleep(5000);
        }
      } else {
        // Try dev login or local form
        const emailInput = await page.$(
          'input[type="email"], input[name="email"], input[placeholder*="email"]'
        );
        const passwordInput = await page.$(
          'input[type="password"], input[name="password"]'
        );
        if (emailInput && passwordInput) {
          await emailInput.fill('student@example.com');
          await passwordInput.fill('Student123!');
          const submitBtn = await page.$('button[type="submit"]');
          if (submitBtn) await submitBtn.click();
          await sleep(5000);
        }
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-04-after-login.png'),
        fullPage: false,
      });
      report('Login', 'INFO', `After login URL: ${page.url()}`);
    } else {
      // Maybe already logged in or dev mode
      report('Login', 'SKIP', 'No login button found, might be dev mode');
    }

    // Check for dev login / consent dialog
    const consentBtn = await page.$(
      'button:has-text("Accept"), button:has-text("אישור"), button:has-text("Consent"), [data-testid="consent-accept"]'
    );
    if (consentBtn) {
      await consentBtn.click();
      await sleep(2000);
    }

    // Step 4: Navigate to Social Feed
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

    // Check RTL indicators on social page
    const socialHeading = await page
      .textContent('h1, h2, [data-testid="page-title"]')
      .catch(() => null);
    report(
      'Social',
      'INFO',
      `Page heading text: "${socialHeading || 'not found'}"`
    );

    const socialDir = await page.evaluate(() => {
      const main =
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.body;
      return getComputedStyle(main).direction;
    });
    report(
      'Social RTL',
      socialDir === 'rtl' ? 'PASS' : 'FAIL',
      `CSS direction: ${socialDir}`
    );

    // Check sidebar position (RTL = sidebar should be on right)
    const sidebarInfo = await page.evaluate(() => {
      const sidebar = document.querySelector(
        'aside, nav[role="navigation"], [data-testid="sidebar"]'
      );
      if (!sidebar) return 'no sidebar found';
      const rect = sidebar.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      return `sidebar left=${Math.round(rect.left)} right=${Math.round(rect.right)} window=${windowWidth} position=${rect.left > windowWidth / 2 ? 'RIGHT' : 'LEFT'}`;
    });
    report('Social Sidebar', 'INFO', sidebarInfo);

    // Step 5: Navigate to Dashboard
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

    const dashDir = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return getComputedStyle(main).direction;
    });
    report(
      'Dashboard RTL',
      dashDir === 'rtl' ? 'PASS' : 'FAIL',
      `CSS direction: ${dashDir}`
    );

    const dashHeading = await page
      .textContent('h1, h2, [data-testid="page-title"]')
      .catch(() => null);
    report(
      'Dashboard',
      'INFO',
      `Page heading: "${dashHeading || 'not found'}"`
    );

    // Step 6: Navigate to Settings
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

    // Check if Hebrew language is selected
    const langInfo = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const s of selects) {
        if (s.value === 'he' || s.textContent.includes('עברית')) {
          return `Found select with value="${s.value}"`;
        }
      }
      const hebrewLabel = document.querySelector(
        '[data-value="he"], [aria-label*="Hebrew"], [aria-label*="עברית"]'
      );
      if (hebrewLabel) return `Found Hebrew label: ${hebrewLabel.textContent}`;
      // Check any text that says Hebrew
      const allText = document.body.innerText;
      if (allText.includes('עברית')) return 'Hebrew text found on page';
      return 'No Hebrew language selector found';
    });
    report('Settings Lang', 'INFO', langInfo);

    // Step 7: Navigate to Gamification
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

    const gamHeading = await page
      .textContent('h1, h2, [data-testid="page-title"]')
      .catch(() => null);
    report(
      'Gamification',
      'INFO',
      `Page heading: "${gamHeading || 'not found'}"`
    );

    // Check tab labels
    const tabInfo = await page.evaluate(() => {
      const tabs = document.querySelectorAll(
        '[role="tab"], .tab, button[data-state]'
      );
      if (tabs.length === 0) return 'No tabs found';
      return Array.from(tabs)
        .map((t) => t.textContent.trim())
        .join(' | ');
    });
    report('Gamification Tabs', 'INFO', `Tabs: ${tabInfo}`);

    const gamDir = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return getComputedStyle(main).direction;
    });
    report(
      'Gamification RTL',
      gamDir === 'rtl' ? 'PASS' : 'FAIL',
      `CSS direction: ${gamDir}`
    );

    // Step 8: Final comprehensive RTL check
    console.log('--- Step 8: Final RTL Check ---');
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(2000);

    const finalRtlCheck = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      return {
        htmlDir: html.dir,
        htmlLang: html.lang,
        bodyDir: getComputedStyle(body).direction,
        bodyTextAlign: getComputedStyle(body).textAlign,
        // Check for English text that should be Hebrew
        bodyText: body.innerText.substring(0, 500),
      };
    });
    report('Final RTL', 'INFO', JSON.stringify(finalRtlCheck, null, 2));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-final.png'),
      fullPage: true,
    });

    // Check all pages for English text that should be Hebrew
    console.log('\n--- English Text Detection ---');
    const englishPatterns = [
      'Dashboard',
      'Social Feed',
      'Settings',
      'Gamification',
      'Courses',
      'Profile',
      'Logout',
      'Login',
    ];
    const bodyText = await page.evaluate(() => document.body.innerText);
    for (const pattern of englishPatterns) {
      if (bodyText.includes(pattern)) {
        report(
          'English Text',
          'WARN',
          `Found English text: "${pattern}" (should be Hebrew)`
        );
      }
    }
  } catch (err) {
    report('Error', 'FAIL', err.message);
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
  for (const r of results) {
    console.log(r);
  }
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * BUG-097 Visual QA Round 3: Hebrew/RTL — handle login flow properly
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

  // Collect console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const results = [];
  function report(step, status, details) {
    const entry = `[${step}] ${status}: ${details}`;
    results.push(entry);
    console.log(entry);
  }

  try {
    // Step 1: Navigate and set Hebrew
    console.log('=== Step 1: Landing page with Hebrew ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1000);

    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('i18nextLng', 'he');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    report('HTML dir', htmlDir === 'rtl' ? 'PASS' : 'FAIL', `dir="${htmlDir}"`);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-01-landing-he.png'),
    });

    // Dump all visible text and all links/buttons
    const pageInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button')).map(
        (el) => ({
          tag: el.tagName,
          text: el.textContent.trim().substring(0, 60),
          href: el.getAttribute('href') || '',
          onclick: el.getAttribute('onclick') || '',
        })
      );
      return { links, bodyText: document.body.innerText.substring(0, 1000) };
    });
    console.log(
      'Landing buttons/links:',
      JSON.stringify(pageInfo.links, null, 2)
    );

    // Check if the landing page has Hebrew text
    const landingHebrew = /[\u0590-\u05FF]/.test(pageInfo.bodyText);
    report(
      'Landing Hebrew text',
      landingHebrew ? 'PASS' : 'FAIL',
      `Has Hebrew chars: ${landingHebrew}`
    );

    // Report specific Hebrew phrases found
    const hebrewPhrases = ['ברוכים הבאים', 'כניסה', 'פלטפורמת', 'גרף ידע'];
    for (const phrase of hebrewPhrases) {
      if (pageInfo.bodyText.includes(phrase)) {
        report('Hebrew phrase', 'PASS', `Found: "${phrase}"`);
      }
    }

    // Step 2: Login via Keycloak
    console.log('\n=== Step 2: Keycloak Login ===');
    // Click the "כניסה עם Keycloak" button on landing page
    const kcBtn = await page.$('text=כניסה עם Keycloak');
    if (!kcBtn) {
      // Try English fallback
      const loginBtn = await page.$('text=Login with Keycloak');
      if (loginBtn) {
        await loginBtn.click();
        report('Login', 'INFO', 'Clicked "Login with Keycloak"');
      } else {
        // Try any button/link that goes to keycloak
        const allBtns = await page.$$('a, button');
        for (const btn of allBtns) {
          const text = await btn.textContent();
          const href = await btn.getAttribute('href');
          if (
            text.includes('Keycloak') ||
            (href && href.includes('keycloak'))
          ) {
            await btn.click();
            report('Login', 'INFO', `Clicked: "${text.trim()}"`);
            break;
          }
        }
      }
    } else {
      await kcBtn.click();
      report('Login', 'INFO', 'Clicked "כניסה עם Keycloak"');
    }

    await sleep(5000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-02-keycloak.png'),
    });

    const currentUrl = page.url();
    report('Login', 'INFO', `URL after KC click: ${currentUrl}`);

    // If on Keycloak page, fill form
    if (
      currentUrl.includes('8080') ||
      currentUrl.includes('keycloak') ||
      currentUrl.includes('auth/realms')
    ) {
      const usernameField = await page.$('#username');
      const passwordField = await page.$('#password');
      if (usernameField && passwordField) {
        await usernameField.fill('student@example.com');
        await passwordField.fill('Student123!');
        const submitBtn = await page.$('#kc-login');
        if (submitBtn) await submitBtn.click();
        report('Login', 'INFO', 'Submitted Keycloak credentials');
        await page
          .waitForURL((url) => !url.toString().includes('8080'), {
            timeout: 15000,
          })
          .catch(() => {});
        await sleep(3000);
      }
    } else {
      report(
        'Login',
        'WARN',
        'Did not reach Keycloak - might be a local login page'
      );
      // Try local login form
      const emailInput = await page.$(
        'input[type="email"], input[name="email"]'
      );
      const passInput = await page.$('input[type="password"]');
      if (emailInput && passInput) {
        await emailInput.fill('student@example.com');
        await passInput.fill('Student123!');
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) await submitBtn.click();
        await sleep(5000);
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-03-after-login.png'),
    });
    report('Login', 'INFO', `Post-login URL: ${page.url()}`);

    // Handle consent
    await sleep(2000);
    const consentCheck = await page.$(
      'button:has-text("Accept"), button:has-text("אישור"), button:has-text("I Agree"), button:has-text("Continue"), [data-testid*="consent"]'
    );
    if (consentCheck) {
      await consentCheck.click();
      await sleep(2000);
      report('Consent', 'INFO', 'Accepted consent dialog');
    }

    // Re-set Hebrew locale
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('i18nextLng', 'he');
    });

    // Are we authenticated? Check if we can access protected pages
    const isAuthenticated = !(
      page.url().includes('/login') || page.url().includes('/auth')
    );
    report(
      'Auth',
      isAuthenticated ? 'PASS' : 'FAIL',
      `Authenticated: ${isAuthenticated}, URL: ${page.url()}`
    );

    if (!isAuthenticated) {
      report(
        'Auth',
        'WARN',
        'Could not authenticate. Will check public pages only.'
      );

      // Check the login page itself for RTL
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await sleep(2000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-login-page-he.png'),
      });

      const loginPageInfo = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        text: document.body.innerText.substring(0, 500),
        hasHebrew: /[\u0590-\u05FF]/.test(document.body.innerText),
      }));
      report(
        'Login Page RTL',
        loginPageInfo.dir === 'rtl' ? 'PASS' : 'FAIL',
        `dir="${loginPageInfo.dir}"`
      );
      report(
        'Login Page Hebrew',
        loginPageInfo.hasHebrew ? 'PASS' : 'WARN',
        `Hebrew present: ${loginPageInfo.hasHebrew}`
      );
      console.log('Login page text:', loginPageInfo.text);
    }

    // Navigate to pages (some may redirect to login)
    const pagesToCheck = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/social', name: 'Social' },
      { path: '/courses', name: 'Courses' },
      { path: '/gamification', name: 'Gamification' },
      { path: '/settings', name: 'Settings' },
    ];

    for (const { path: pagePath, name } of pagesToCheck) {
      console.log(`\n=== Checking ${name} (${pagePath}) ===`);
      await page.goto(`${BASE_URL}${pagePath}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await sleep(2000);

      const pageCheck = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        url: window.location.href,
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1, h2, h3'))
          .map((h) => h.textContent.trim())
          .slice(0, 5),
        hasHebrew: /[\u0590-\u05FF]/.test(document.body.innerText),
        bodyDirection: getComputedStyle(document.body).direction,
      }));

      const screenshotName = `bug097-rtl-${name.toLowerCase()}-he.png`;
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, screenshotName),
      });

      report(
        `${name} RTL`,
        pageCheck.dir === 'rtl' ? 'PASS' : 'FAIL',
        `dir="${pageCheck.dir}" bodyDir="${pageCheck.bodyDirection}"`
      );
      report(
        `${name} Hebrew`,
        pageCheck.hasHebrew ? 'PASS' : 'INFO',
        `Hebrew: ${pageCheck.hasHebrew}`
      );
      report(
        `${name} Headings`,
        'INFO',
        pageCheck.headings.join(' | ') || 'none'
      );

      if (pageCheck.url.includes('/login') || pageCheck.url.includes('auth')) {
        report(`${name}`, 'INFO', 'Redirected to login (auth required)');
      }
    }

    // Final comprehensive screenshot
    console.log('\n=== Final RTL Layout Analysis ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-final.png'),
      fullPage: true,
    });

    // Check text alignment and layout direction on landing
    const layoutAnalysis = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'h1, h2, h3, p, button, a, nav, aside, main, header, footer'
      );
      const layoutInfo = [];
      for (const el of elements) {
        const cs = getComputedStyle(el);
        if (cs.direction === 'ltr' && el.textContent.trim().length > 0) {
          layoutInfo.push({
            tag: el.tagName,
            text: el.textContent.trim().substring(0, 40),
            direction: cs.direction,
            textAlign: cs.textAlign,
          });
        }
      }
      return { ltrElements: layoutInfo.slice(0, 10) };
    });

    if (layoutAnalysis.ltrElements.length > 0) {
      report(
        'LTR Elements',
        'WARN',
        `Found ${layoutAnalysis.ltrElements.length} elements with direction:ltr`
      );
      for (const el of layoutAnalysis.ltrElements) {
        console.log(
          `  ${el.tag}: "${el.text}" dir=${el.direction} align=${el.textAlign}`
        );
      }
    } else {
      report('LTR Elements', 'PASS', 'No LTR elements found (all RTL)');
    }
  } catch (err) {
    report('Error', 'FAIL', err.message);
    console.error(err.stack);
    await page
      .screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug097-rtl-error.png') })
      .catch(() => {});
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n========================================');
  console.log('       VISUAL QA SUMMARY — BUG-097');
  console.log('========================================');
  const passes = results.filter((r) => r.includes('] PASS')).length;
  const fails = results.filter((r) => r.includes('] FAIL')).length;
  const warns = results.filter((r) => r.includes('] WARN')).length;
  console.log(`PASS: ${passes} | FAIL: ${fails} | WARN: ${warns}`);
  console.log('');
  for (const r of results) {
    if (r.includes('PASS') || r.includes('FAIL') || r.includes('WARN')) {
      console.log(r);
    }
  }

  console.log('\n--- Screenshots saved ---');
  const screenshots = fs
    .readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.startsWith('bug097'));
  for (const s of screenshots) {
    console.log(`  docs/screenshots/${s}`);
  }
  console.log('========================================');

  if (consoleErrors.length > 0) {
    console.log('\n--- Browser Console Errors ---');
    for (const err of consoleErrors.slice(0, 10)) {
      console.log(`  ${err}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

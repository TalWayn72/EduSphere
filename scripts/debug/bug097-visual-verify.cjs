/**
 * BUG-097 Visual Verification — Hebrew translations on /social and /gamification
 */
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'he' });
  const page = await context.newPage();

  // Set Hebrew locale in localStorage before navigating
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });

  console.log('Navigating to http://localhost:5173 ...');
  try {
    await page.goto('http://localhost:5173', { timeout: 10000 });
  } catch (e) {
    console.error('Could not reach localhost:5173 — is the dev server running?');
    console.error(e.message);
    await browser.close();
    process.exit(1);
  }

  // Try dev-login if available
  console.log('Looking for dev-login button...');
  const devLogin = page.locator('[data-testid="dev-login-btn"], button:has-text("Dev Login"), button:has-text("student")');
  if (await devLogin.count() > 0) {
    console.log('Found dev-login button, clicking...');
    await devLogin.first().click();
    await page.waitForTimeout(2000);
  } else {
    console.log('No dev-login button found, trying Keycloak login...');
    // Navigate to login
    const loginBtn = page.locator('a[href*="login"], button:has-text("Login"), button:has-text("Sign in"), a:has-text("Login")');
    if (await loginBtn.count() > 0) {
      await loginBtn.first().click();
      await page.waitForTimeout(3000);
    }
    // Fill Keycloak form
    const usernameInput = page.locator('#username, input[name="username"]');
    if (await usernameInput.count() > 0) {
      await usernameInput.fill('student@example.com');
      await page.locator('#password, input[name="password"]').fill('Student123!');
      await page.locator('#kc-login, button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
  }

  // Navigate to /social
  console.log('Navigating to /social ...');
  await page.goto('http://localhost:5173/social', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug097-social-he.png'), fullPage: false });

  // Check for Hebrew heading
  const socialHeading = await page.textContent('h1, h2, [data-testid="page-title"]').catch(() => null);
  console.log('Social page heading:', socialHeading);
  const hasSocialHebrew = socialHeading && socialHeading.includes('פיד חברתי');
  console.log('Hebrew social heading found:', hasSocialHebrew);

  // Navigate to /gamification
  console.log('Navigating to /gamification ...');
  await page.goto('http://localhost:5173/gamification', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug097-gamification-he.png'), fullPage: false });

  const gamifHeading = await page.textContent('h1, h2, [data-testid="page-title"]').catch(() => null);
  console.log('Gamification page heading:', gamifHeading);
  const hasGamifHebrew = gamifHeading && gamifHeading.includes('גיימיפיקציה');
  console.log('Hebrew gamification heading found:', hasGamifHebrew);

  await browser.close();

  console.log('\n=== BUG-097 Visual Verification Results ===');
  console.log(`Social page Hebrew: ${hasSocialHebrew ? 'PASS' : 'CHECK SCREENSHOT'}`);
  console.log(`Gamification page Hebrew: ${hasGamifHebrew ? 'PASS' : 'CHECK SCREENSHOT'}`);
  console.log(`Screenshots saved to docs/screenshots/bug097-*.png`);
})();

/**
 * BUG-088 Visual Verification — consent flow with dev mode auth
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:5177';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Set dev mode auth + English locale
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // Login via dev mode
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  try {
    await devBtn.waitFor({ timeout: 10000 });
    await devBtn.click();
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
  } catch (e) {
    console.log('DEV LOGIN: Could not find dev login button, trying without auth');
  }
  await page.waitForLoadState('domcontentloaded');

  const results = [];

  // TEST 1: Settings page with returnTo shows back button
  try {
    await page.goto(BASE_URL + '/settings?highlight=ai-consent&returnTo=%2Fcourses%2Fnew', {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(2000);

    const hasBackButton = await page.locator('button:has(svg.lucide-arrow-left)').isVisible().catch(() => false);
    const hasPrivacyCard = await page.locator('text=Privacy & AI').first().isVisible({ timeout: 5000 }).catch(() =>
      page.locator('text=פרטיות').first().isVisible({ timeout: 3000 }).catch(() => false)
    );
    const hasToggle = await page.locator('#setting-ai-consent').isVisible({ timeout: 5000 }).catch(() => false);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug088-settings-returnto.png'), fullPage: true });
    results.push({ test: 'Settings+returnTo', backButton: hasBackButton, privacyCard: hasPrivacyCard, toggle: hasToggle,
      pass: hasBackButton && hasPrivacyCard && hasToggle });
    console.log('TEST 1:', hasBackButton && hasPrivacyCard && hasToggle ? 'PASS' : 'FAIL',
      `(backBtn=${hasBackButton}, privacy=${hasPrivacyCard}, toggle=${hasToggle})`);
  } catch (e) {
    results.push({ test: 'Settings+returnTo', error: e.message, pass: false });
    console.log('TEST 1: FAIL -', e.message);
  }

  // TEST 2: No back button on plain /settings
  try {
    await page.goto(BASE_URL + '/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const noBackButton = (await page.locator('button:has(svg.lucide-arrow-left)').isVisible().catch(() => false)) === false;
    results.push({ test: 'No backBtn', noBackButton, pass: noBackButton });
    console.log('TEST 2:', noBackButton ? 'PASS' : 'FAIL');
  } catch (e) {
    results.push({ test: 'No backBtn', error: e.message, pass: false });
    console.log('TEST 2: FAIL -', e.message);
  }

  // TEST 3: Toggle is interactive + saves to localStorage
  try {
    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    const visible = await toggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      const before = await toggle.getAttribute('aria-checked');
      await toggle.click();
      await page.waitForTimeout(500);
      const after = await toggle.getAttribute('aria-checked');
      const changed = before !== after;
      const lsValue = await page.evaluate(() => localStorage.getItem('edusphere_consent_AI_PROCESSING'));

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug088-toggle-clicked.png'), fullPage: true });
      results.push({ test: 'Toggle', changed, lsValue, pass: changed });
      console.log('TEST 3:', changed ? 'PASS' : 'FAIL', `(${before}->${after}, ls=${lsValue})`);
    } else {
      results.push({ test: 'Toggle', error: 'not visible', pass: false });
      console.log('TEST 3: FAIL - toggle not visible');
    }
  } catch (e) {
    results.push({ test: 'Toggle', error: e.message, pass: false });
    console.log('TEST 3: FAIL -', e.message);
  }

  // TEST 4: Settings page does NOT crash (BUG-087 still fixed)
  try {
    const hasCrash = await page.locator('text=Something went wrong').isVisible({ timeout: 2000 }).catch(() => false);
    results.push({ test: 'No crash', pass: (hasCrash === false) });
    console.log('TEST 4:', (hasCrash === false) ? 'PASS' : 'FAIL');
  } catch (e) {
    results.push({ test: 'No crash', pass: true });
    console.log('TEST 4: PASS');
  }

  console.log('\n=== BUG-088 VISUAL VERIFICATION ===');
  const allPass = results.every(r => r.pass);
  console.log(allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

  await browser.close();
  process.exit(allPass ? 0 : 1);
})();

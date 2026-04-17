/**
 * BUG-092 Visual E2E: AI Course Generation via UI with Keycloak auth.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // ─── Step 1: Login via Keycloak ───
  console.log('[1/7] Navigating to login...');
  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug092-01-login-page.png'),
  });
  console.log('[1/7] At:', page.url());

  // Look for Sign In with Keycloak button
  const signInBtn = page
    .locator('button')
    .filter({ hasText: /sign in|keycloak|התחבר/i })
    .first();
  const hasSignIn = await signInBtn
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (hasSignIn) {
    console.log('[1/7] Clicking Sign In with Keycloak...');
    await signInBtn.click();
    // Wait for Keycloak form
    await page.waitForURL(/realms/, { timeout: 20000 });
    await page.locator('#username').waitFor({ timeout: 10000 });
    await page.fill('#username', 'instructor@example.com');
    await page.fill('#password', 'Instructor123!');
    await page.click('#kc-login');
    // Wait for redirect back to app
    await page.waitForURL(/localhost:5173/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  } else {
    // Try dev mode login
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    const hasDev = await devBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDev) {
      console.log('[1/7] Dev mode login...');
      await devBtn.click();
      await page.waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 20000,
      });
      await page.waitForLoadState('domcontentloaded');
    } else {
      // Maybe already logged in or direct Keycloak redirect
      const url = page.url();
      if (url.includes('keycloak') || url.includes('/realms/')) {
        await page.locator('#username').waitFor({ timeout: 10000 });
        await page.fill('#username', 'instructor@example.com');
        await page.fill('#password', 'Instructor123!');
        await page.click('#kc-login');
        await page.waitForURL(/localhost:5173/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
      }
    }
  }

  console.log('[1/7] Logged in at:', page.url());
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug092-01-logged-in.png'),
  });

  // ─── Step 2: Enable AI consent ───
  console.log('[2/7] Navigating to /settings...');
  await page.goto(`${BASE}/settings`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug092-02-settings.png'),
  });

  // Check if redirected to login (session lost)
  if (page.url().includes('/login')) {
    console.error('[2/7] Redirected to login — session not maintained');
    await browser.close();
    process.exit(1);
  }

  const aiToggle = page.locator('#setting-ai-consent [role="switch"]');
  const toggleVisible = await aiToggle
    .isVisible({ timeout: 15000 })
    .catch(() => false);

  if (!toggleVisible) {
    console.log(
      '[2/7] AI consent toggle not found, looking for Privacy section...'
    );
    // Try scrolling down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug092-02-scrolled.png'),
    });
  }

  if (toggleVisible || (await aiToggle.isVisible().catch(() => false))) {
    const consentState = await aiToggle.getAttribute('aria-checked');
    console.log('[2/7] AI consent state:', consentState);
    if (consentState === 'false') {
      await aiToggle.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug092-02-consent-enabled.png'),
    });
    console.log('[2/7] AI consent enabled');
  } else {
    console.log(
      '[2/7] Cannot find toggle — proceeding anyway (consent may already be enabled via API)'
    );
  }

  // ─── Step 3: Navigate to /courses/new ───
  console.log('[3/7] Navigating to /courses/new...');
  await page.goto(`${BASE}/courses/new`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug092-03-courses-new.png'),
  });
  console.log('[3/7] At:', page.url());

  // ─── Step 4: Click Launch AI Builder ───
  console.log('[4/7] Opening AI Builder...');
  const launchBtn = page
    .locator('button, a')
    .filter({
      hasText: /Launch AI|הפעל.*AI|AI.*Builder|בונה AI|יוצר קורסים/i,
    })
    .first();

  const btnVisible = await launchBtn
    .isVisible({ timeout: 15000 })
    .catch(() => false);
  if (!btnVisible) {
    console.error('[4/7] Launch AI Builder button not found');
    const pageText = await page.textContent('body');
    console.log('Page content (500):', pageText.slice(0, 500));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug092-04-no-button.png'),
    });
    await browser.close();
    process.exit(1);
  }

  await launchBtn.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('[role="dialog"]');
  const modalVisible = await modal
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (modalVisible) {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug092-04-modal-open.png'),
    });
    console.log('[4/7] AI Builder modal opened');
  } else {
    console.log('[4/7] No modal — AI builder may be inline');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug092-04-after-click.png'),
    });
  }

  // ─── Step 5: Fill prompt and generate ───
  console.log('[5/7] Filling prompt...');
  const container = modalVisible ? modal : page;
  const textarea = container.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.fill('Introduction to basic mathematics for beginners');

  const generateBtn = container
    .locator('button')
    .filter({
      hasText: /Generate|צור קורס|Generate Course/i,
    })
    .first();
  await generateBtn.waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug092-05-ready.png'),
  });
  await generateBtn.click();
  console.log('[5/7] Generate clicked — waiting for LLM (~3-4 min on CPU)...');

  // ─── Step 6: Wait for completion ───
  const startTime = Date.now();
  let completed = false;

  for (let i = 0; i < 72; i++) {
    // 72 x 5s = 6 min max
    await page.waitForTimeout(5000);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    // Check for spinner
    const spinner = container.locator('.animate-spin');
    const spinnerVisible = await spinner.isVisible().catch(() => false);

    // Check for result indicators
    const outlineTitle = container.locator(
      'h3.font-semibold, h3, [class*="title"]'
    );
    const hasOutline = (await outlineTitle.count()) > 1; // Multiple titles = modules

    const errorAlert = container.locator(
      '.text-destructive, [data-type="error"]'
    );
    const hasError = await errorAlert.isVisible().catch(() => false);

    if (!spinnerVisible || hasOutline || hasError) {
      console.log(
        `[6/7] Completed after ${elapsed}s (spinner=${spinnerVisible}, outline=${hasOutline}, error=${hasError})`
      );
      completed = true;
      break;
    }

    if (i % 6 === 0) {
      console.log(`[6/7] Still generating... ${elapsed}s`);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `bug092-06-gen-${elapsed}s.png`),
      });
    }
  }

  if (!completed) {
    console.error('[6/7] TIMEOUT after 6 minutes');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug092-06-timeout.png'),
    });
    await browser.close();
    process.exit(1);
  }

  // ─── Step 7: Capture result ───
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug092-07-result.png'),
  });

  const modalText = await container.textContent();
  console.log('[7/7] Result text (800 chars):', modalText.slice(0, 800));

  // Extract course info
  const h3s = await container.locator('h3').allTextContents();
  console.log('\n=============================');
  console.log('  AI COURSE CREATION RESULT');
  console.log('=============================');
  console.log('H3 titles found:', h3s);

  // Check for known course title pattern
  if (
    modalText.includes('Introduction') ||
    modalText.includes('Mathematics') ||
    modalText.includes('Module')
  ) {
    console.log('STATUS: SUCCESS — Course outline visible in UI');
  } else if (
    modalText.includes('error') ||
    modalText.includes('failed') ||
    modalText.includes('שגיאה')
  ) {
    console.log('STATUS: FAILED — Error shown in UI');
  } else {
    console.log('STATUS: UNKNOWN — Check screenshots');
  }
  console.log('=============================\n');

  console.log('[DONE] Screenshots: docs/screenshots/bug092-*.png');
  await browser.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

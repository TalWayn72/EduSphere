/**
 * BUG-094 Full E2E: Consent via Settings UI → AI Course Creation.
 * Tests the REAL user flow: login → settings → toggle consent → /courses/new → generate.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  // Force English locale
  // Only set locale/sidebar — do NOT touch consent here (runs on every navigation)
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // ─── Step 1: Login via Keycloak ───
  console.log('[1/9] Login via Keycloak...');
  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  // Clear consent ONCE after first page load (not in addInitScript which repeats)
  await page.evaluate(() => {
    localStorage.removeItem('edusphere_consent_AI_PROCESSING');
    localStorage.removeItem('edusphere_consent_THIRD_PARTY_LLM');
  });
  await page.waitForTimeout(1000);

  let url = page.url();
  if (!url.includes('keycloak') && !url.includes('/realms/')) {
    const signInBtn = page
      .locator('button')
      .filter({ hasText: /sign in|keycloak/i })
      .first();
    await signInBtn.waitFor({ timeout: 10000 });
    await signInBtn.click();
    await page.waitForURL(/realms/, { timeout: 20000 });
  }
  await page.locator('#username').waitFor({ timeout: 10000 });
  await page.fill('#username', 'instructor@example.com');
  await page.fill('#password', 'Instructor123!');
  await page.click('#kc-login');
  await page.waitForURL(/localhost:5173/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('[1/9] Logged in at:', page.url());
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-01-logged-in.png'),
  });

  // ─── Step 2: Navigate to Settings ───
  console.log('[2/9] Navigating to Settings...');
  await page.goto(`${BASE}/settings`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-02-settings.png'),
  });

  // ─── Step 3: Toggle AI consent ON via UI ───
  console.log('[3/9] Toggling AI consent ON...');
  // Find the AI Processing toggle switch
  const aiToggle = page
    .locator(
      '#setting-ai-consent button[role="switch"], #setting-ai-consent [role="switch"]'
    )
    .first();
  const toggleVisible = await aiToggle
    .isVisible({ timeout: 10000 })
    .catch(() => false);

  if (!toggleVisible) {
    // Try alternative: find by label text
    const altToggle = page
      .locator('text=AI Processing')
      .locator('..')
      .locator('..')
      .locator('[role="switch"]')
      .first();
    const altVisible = await altToggle
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (altVisible) {
      const state = await altToggle.getAttribute('aria-checked');
      console.log('[3/9] Found toggle via label, state:', state);
      if (state === 'false') await altToggle.click();
    } else {
      console.error('[3/9] FAIL: Cannot find AI consent toggle!');
      await browser.close();
      process.exit(1);
    }
  } else {
    const state = await aiToggle.getAttribute('aria-checked');
    console.log('[3/9] Toggle state before:', state);
    if (state === 'false') {
      await aiToggle.click();
    }
  }

  // Wait for mutation response
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-03-consent-toggled.png'),
  });

  // Check for error toast
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
  const hasError = await errorToast
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (hasError) {
    const errorText = await errorToast.textContent().catch(() => '');
    console.error('[3/9] FAIL: Error toast appeared:', errorText);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug094-03-error-toast.png'),
    });
    await browser.close();
    process.exit(1);
  }

  // Check for success toast
  const successToast = page.locator('[data-sonner-toast][data-type="success"]');
  const hasSuccess = await successToast
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  console.log('[3/9] Success toast:', hasSuccess);

  // Verify localStorage was set
  const consentVal = await page.evaluate(() =>
    localStorage.getItem('edusphere_consent_AI_PROCESSING')
  );
  console.log('[3/9] AI consent in localStorage:', consentVal);
  if (consentVal !== 'true') {
    console.error('[3/9] FAIL: Consent not saved to localStorage!');
    await browser.close();
    process.exit(1);
  }
  console.log('[3/9] PASS: AI consent enabled via Settings UI');

  // ─── Step 4: Navigate to /courses/new ───
  console.log('[4/9] Navigating to /courses/new...');
  await page.goto(`${BASE}/courses/new`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-04-courses-new.png'),
  });

  // ─── Step 5: Open AI Builder ───
  console.log('[5/9] Launch AI Builder...');
  const launchBtn = page
    .locator('button, a')
    .filter({
      hasText: /Launch AI|AI.*Builder/i,
    })
    .first();
  await launchBtn.waitFor({ timeout: 15000 });
  await launchBtn.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('[role="dialog"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-05-modal-open.png'),
  });

  // ─── Step 6: Fill prompt and generate ───
  console.log('[6/9] Fill prompt + Generate...');
  const textarea = modal.locator('textarea').first();
  await textarea.fill('Colors');

  const generateBtn = modal
    .locator('button')
    .filter({
      hasText: /Generate|Generate Course/i,
    })
    .first();
  await generateBtn.waitFor({ state: 'visible', timeout: 5000 });

  // Verify button is NOT disabled (consent should be granted)
  const isDisabled = await generateBtn.isDisabled();
  if (isDisabled) {
    console.error(
      '[6/9] FAIL: Generate button is disabled! Consent may not have propagated.'
    );
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug094-06-btn-disabled.png'),
    });
    await browser.close();
    process.exit(1);
  }

  await generateBtn.click();
  console.log('[6/9] Generate clicked');

  // ─── Step 7: Verify ProgressStatus renders ───
  await page.waitForTimeout(2000);
  const statusElements = modal.locator('[role="status"]');
  const statusCount = await statusElements.count();
  const firstStatusText =
    statusCount > 0 ? await statusElements.first().textContent() : null;
  console.log(
    `[7/9] ProgressStatus count: ${statusCount}, text: "${firstStatusText}"`
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-07-progress.png'),
  });

  if (statusCount === 0) {
    console.error('[7/9] FAIL: ProgressStatus NOT rendering!');
    await browser.close();
    process.exit(1);
  }
  console.log('[7/9] PASS: ProgressStatus is rendering');

  // ─── Step 8: Wait for LLM completion ───
  console.log('[8/9] Waiting for LLM completion (up to 15 min on CPU)...');
  const startTime = Date.now();
  let completed = false;

  for (let i = 0; i < 180; i++) {
    await page.waitForTimeout(5000);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    const outlineTitle = modal.locator('h3.font-semibold');
    const hasOutline = await outlineTitle.isVisible().catch(() => false);
    const errorAlert = modal.locator('.text-destructive');
    const hasErr = await errorAlert.isVisible().catch(() => false);
    const statusStill = await statusElements
      .first()
      .isVisible()
      .catch(() => false);

    if (hasOutline || hasErr || (!statusStill && elapsed > 10)) {
      console.log(
        `[8/9] Done after ${elapsed}s (outline=${hasOutline}, error=${hasErr})`
      );
      completed = true;
      break;
    }

    if (i % 6 === 0) {
      console.log(`[8/9] Still generating... ${elapsed}s`);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `bug094-08-gen-${elapsed}s.png`),
      });
    }
  }

  if (!completed) {
    console.error('[8/9] TIMEOUT after 15 minutes');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug094-08-timeout.png'),
    });
    await browser.close();
    process.exit(1);
  }

  // ─── Step 9: Capture result ───
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug094-09-result.png'),
  });

  const h3s = await modal.locator('h3').allTextContents();
  const modalText = await modal.textContent();

  console.log('\n=============================');
  console.log('  BUG-094 FULL E2E RESULT');
  console.log('=============================');
  console.log('H3 titles:', h3s);

  if (h3s.length > 0) {
    const courseName = h3s[0] || 'Unknown';
    console.log(`STATUS: SUCCESS`);
    console.log(`COURSE NAME: ${courseName}`);
  } else if (modalText.includes('error') || modalText.includes('timed out')) {
    console.log('STATUS: FAILED — Error in UI');
    const errText = await modal
      .locator('.text-destructive')
      .textContent()
      .catch(() => '');
    console.log('Error:', errText);
  } else {
    console.log('STATUS: UNKNOWN — Check screenshots');
  }
  console.log('=============================\n');

  console.log('[DONE] Screenshots: docs/screenshots/bug094-*.png');
  await browser.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

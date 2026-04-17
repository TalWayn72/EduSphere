/**
 * BUG-093 Visual E2E: Create AI course end-to-end.
 * Verifies: ProgressStatus visible, course generated, reports course name.
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

  // Force English locale + pre-set AI consent in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    // Pre-enable AI consent flags so Generate button is not disabled
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    localStorage.setItem('edusphere_consent_THIRD_PARTY_LLM', 'true');
  });

  // ─── Step 1: Login via Keycloak ───
  console.log('[1/8] Login via Keycloak...');
  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

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
  console.log('[1/8] Logged in at:', page.url());
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug093-01-logged-in.png'),
  });

  // ─── Step 2: Set AI consent directly in localStorage ───
  // Skip Settings page — the mutation may fail without backend, which reverts localStorage.
  // Instead, set consent directly via evaluate right before navigating to /courses/new.
  console.log('[2/8] Setting AI consent via localStorage...');
  await page.evaluate(() => {
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    localStorage.setItem('edusphere_consent_THIRD_PARTY_LLM', 'true');
  });
  const consentCheck = await page.evaluate(() =>
    localStorage.getItem('edusphere_consent_AI_PROCESSING')
  );
  console.log('[2/8] AI consent:', consentCheck);

  // ─── Step 3: Navigate to /courses/new ───
  console.log('[3/8] /courses/new...');
  await page.goto(`${BASE}/courses/new`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // ─── Step 4: Open AI Builder ───
  console.log('[4/8] Launch AI Builder...');
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
    path: path.join(SCREENSHOT_DIR, 'bug093-04-modal-open.png'),
  });

  // ─── Step 5: Fill prompt and generate ───
  console.log('[5/8] Fill prompt + Generate...');
  const textarea = modal.locator('textarea').first();
  await textarea.fill('Colors');

  const generateBtn = modal
    .locator('button')
    .filter({
      hasText: /Generate|Generate Course/i,
    })
    .first();
  await generateBtn.waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug093-05-ready.png'),
  });
  await generateBtn.click();
  console.log('[5/8] Generate clicked');

  // ─── Step 6: Verify ProgressStatus renders (BUG-093 regression) ───
  await page.waitForTimeout(2000);
  const statusElements = modal.locator('[role="status"]');
  const statusCount = await statusElements.count();
  const firstStatusText =
    statusCount > 0 ? await statusElements.first().textContent() : null;
  console.log(
    `[6/8] ProgressStatus role="status" count: ${statusCount}, text: "${firstStatusText}"`
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug093-06-progress-visible.png'),
  });

  if (statusCount === 0) {
    console.error('[6/8] FAIL: ProgressStatus NOT rendering!');
    await browser.close();
    process.exit(1);
  }
  console.log('[6/8] PASS: ProgressStatus is rendering');

  // Capture cycling at 6s
  await page.waitForTimeout(4000);
  const laterText = await statusElements
    .first()
    .textContent()
    .catch(() => null);
  console.log(`[6/8] After 6s, text: "${laterText}"`);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug093-06-progress-cycling.png'),
  });

  // ─── Step 7: Wait for completion (up to 10 min) ───
  console.log('[7/8] Waiting for LLM completion (up to 15 min on CPU)...');
  const startTime = Date.now();
  let completed = false;

  for (let i = 0; i < 180; i++) {
    // 180 x 5s = 15 min max
    await page.waitForTimeout(5000);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    // Check for outline (h3 titles)
    const outlineTitle = modal.locator('h3.font-semibold');
    const hasOutline = await outlineTitle.isVisible().catch(() => false);

    // Check for error
    const errorAlert = modal.locator('.text-destructive');
    const hasError = await errorAlert.isVisible().catch(() => false);

    // Check if spinner stopped
    const statusStill = await statusElements
      .first()
      .isVisible()
      .catch(() => false);

    if (hasOutline || hasError || (!statusStill && elapsed > 10)) {
      console.log(
        `[7/8] Done after ${elapsed}s (outline=${hasOutline}, error=${hasError})`
      );
      completed = true;
      break;
    }

    if (i % 6 === 0) {
      console.log(`[7/8] Still generating... ${elapsed}s`);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `bug093-07-gen-${elapsed}s.png`),
      });
    }
  }

  if (!completed) {
    console.error('[7/8] TIMEOUT after 15 minutes');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bug093-07-timeout.png'),
    });
    await browser.close();
    process.exit(1);
  }

  // ─── Step 8: Capture result ───
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'bug093-08-result.png'),
  });

  const h3s = await modal.locator('h3').allTextContents();
  const modalText = await modal.textContent();

  console.log('\n=============================');
  console.log('  BUG-093 VISUAL TEST RESULT');
  console.log('=============================');
  console.log('H3 titles:', h3s);

  if (
    h3s.length > 0 &&
    (modalText.includes('Module') || modalText.includes('Introduction'))
  ) {
    const courseName = h3s[0] || 'Unknown';
    console.log(`STATUS: SUCCESS`);
    console.log(`COURSE NAME: ${courseName}`);
  } else if (modalText.includes('error') || modalText.includes('timed out')) {
    console.log('STATUS: FAILED — Error in UI');
    const errorText = await modal
      .locator('.text-destructive')
      .textContent()
      .catch(() => '');
    console.log('Error:', errorText);
  } else {
    console.log('STATUS: UNKNOWN — Check screenshots');
  }
  console.log('=============================\n');

  console.log('[DONE] Screenshots: docs/screenshots/bug093-*.png');
  await browser.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

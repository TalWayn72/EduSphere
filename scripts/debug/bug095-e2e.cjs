/**
 * BUG-095 E2E: AI Course Creation end-to-end test.
 *
 * Reproducer: login → settings → consent → /courses/new → generate → verify outcome.
 * Expected: After LLM generation completes, outline is shown with course title + modules.
 *           Then "Create Draft" creates the course and redirects to /courses/<id>.
 *
 * BUG-095 root cause: llama3.2 (3.2B) too slow on CPU + gateway SSE timeout
 * kills subscription after ~60s + no polling fallback.
 *
 * Fix: Auto-select smallest model (qwen2.5:0.5b) + frontend polling fallback.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Force English locale + collapsed sidebar
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // ─── Step 1: Login via Keycloak ───
  console.log('[1/10] Login via Keycloak...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  // Clear consent (fresh start)
  await page.evaluate(() => {
    localStorage.removeItem('edusphere_consent_AI_PROCESSING');
    localStorage.removeItem('edusphere_consent_THIRD_PARTY_LLM');
  });
  await page.waitForTimeout(1000);

  let url = page.url();
  if (!url.includes('keycloak') && !url.includes('/realms/')) {
    const signInBtn = page.locator('button').filter({ hasText: /sign in|keycloak/i }).first();
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
  console.log('[1/10] Logged in at:', page.url());

  // ─── Step 2: Navigate to Settings & toggle consent ───
  console.log('[2/10] Settings → toggle AI consent ON...');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const aiToggle = page.locator('#setting-ai-consent button[role="switch"], #setting-ai-consent [role="switch"]').first();
  const toggleVisible = await aiToggle.isVisible({ timeout: 10000 }).catch(() => false);

  if (!toggleVisible) {
    const altToggle = page.locator('text=AI Processing').locator('..').locator('..').locator('[role="switch"]').first();
    const altVisible = await altToggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (altVisible) {
      const state = await altToggle.getAttribute('aria-checked');
      if (state === 'false') await altToggle.click();
    } else {
      console.error('[2/10] FAIL: Cannot find AI consent toggle!');
      await browser.close();
      process.exit(1);
    }
  } else {
    const state = await aiToggle.getAttribute('aria-checked');
    if (state === 'false') await aiToggle.click();
  }

  await page.waitForTimeout(3000);
  const consentVal = await page.evaluate(() => localStorage.getItem('edusphere_consent_AI_PROCESSING'));
  if (consentVal !== 'true') {
    console.error('[2/10] FAIL: Consent not saved to localStorage!');
    await browser.close();
    process.exit(1);
  }
  console.log('[2/10] PASS: AI consent enabled');

  // ─── Step 3: Navigate to /courses/new ───
  console.log('[3/10] Navigating to /courses/new...');
  await page.goto(`${BASE}/courses/new`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ─── Step 4: Open AI Builder modal ───
  console.log('[4/10] Launch AI Builder...');
  const launchBtn = page.locator('button, a').filter({ hasText: /Launch AI|AI.*Builder/i }).first();
  await launchBtn.waitFor({ timeout: 15000 });
  await launchBtn.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('[role="dialog"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug095-04-modal-open.png') });

  // ─── Step 5: Fill prompt and generate ───
  console.log('[5/10] Fill prompt + Generate...');
  const textarea = modal.locator('textarea').first();
  await textarea.fill('Introduction to Colors');

  const generateBtn = modal.locator('button').filter({ hasText: /Generate|Generate Course/i }).first();
  await generateBtn.waitFor({ state: 'visible', timeout: 5000 });
  const isDisabled = await generateBtn.isDisabled();
  if (isDisabled) {
    console.error('[5/10] FAIL: Generate button is disabled!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug095-05-btn-disabled.png') });
    await browser.close();
    process.exit(1);
  }

  // Monitor network for both subscription and poll requests
  let sawSubscription = false;
  let sawPoll = false;
  page.on('request', (req) => {
    const reqUrl = req.url();
    if (reqUrl.includes('ExecutionStatusChanged') && req.headers()['accept']?.includes('text/event-stream')) {
      sawSubscription = true;
    }
    if (reqUrl.includes('AgentExecution') && !reqUrl.includes('subscription')) {
      sawPoll = true;
    }
  });

  await generateBtn.click();
  console.log('[5/10] Generate clicked, waiting for LLM...');

  // ─── Step 6: Wait for progress indicator ───
  await page.waitForTimeout(2000);
  const statusElements = modal.locator('[role="status"]');
  const statusCount = await statusElements.count();
  console.log(`[6/10] ProgressStatus count: ${statusCount}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug095-06-progress.png') });

  // ─── Step 7: Wait for LLM completion (up to 10 minutes for CPU) ───
  console.log('[7/10] Waiting for LLM completion (up to 10 min on CPU)...');
  const startTime = Date.now();
  let completed = false;
  let outlineVisible = false;
  let errorVisible = false;

  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(5000);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    const outlineTitle = modal.locator('h3.font-semibold');
    outlineVisible = await outlineTitle.isVisible().catch(() => false);
    const errorAlert = modal.locator('.text-destructive');
    errorVisible = await errorAlert.isVisible().catch(() => false);

    if (outlineVisible || errorVisible) {
      console.log(`[7/10] Done after ${elapsed}s (outline=${outlineVisible}, error=${errorVisible})`);
      completed = true;
      break;
    }

    if (i % 6 === 0) {
      console.log(`[7/10] Still generating... ${elapsed}s (sub=${sawSubscription}, poll=${sawPoll})`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `bug095-07-gen-${elapsed}s.png`) });
    }
  }

  if (!completed) {
    console.error('[7/10] TIMEOUT after 10 minutes');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug095-07-timeout.png') });
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug095-08-result.png') });

  // ─── Step 8: Verify outline is shown ───
  if (!outlineVisible) {
    const errText = await modal.locator('.text-destructive').textContent().catch(() => '');
    console.error('[8/10] FAIL: No outline shown. Error:', errText);
    await browser.close();
    process.exit(1);
  }

  const courseTitle = await modal.locator('h3.font-semibold').first().textContent().catch(() => '');
  const moduleCount = await modal.locator('.border.rounded-lg').count();
  console.log(`[8/10] PASS: Outline visible — "${courseTitle}" with ${moduleCount} modules`);

  // ─── Step 9: Click "Create as Draft" ───
  console.log('[9/10] Creating draft course...');
  const createDraftBtn = modal.locator('button').filter({ hasText: /Create as Draft|Create Draft/i }).first();
  await createDraftBtn.waitFor({ state: 'visible', timeout: 5000 });
  await createDraftBtn.click();

  // Wait for navigation to /courses/<uuid>
  await page.waitForTimeout(3000);
  await page.waitForURL(/\/courses\/[a-f0-9-]+/i, { timeout: 15000 }).catch(() => {});
  const finalUrl = page.url();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug095-09-created.png') });

  // ─── Step 10: Final Result ───
  console.log('\n=============================');
  console.log('  BUG-095 E2E RESULT');
  console.log('=============================');

  const courseIdMatch = finalUrl.match(/\/courses\/([a-f0-9-]+)/i);
  if (courseIdMatch) {
    console.log('STATUS: SUCCESS');
    console.log(`COURSE TITLE: ${courseTitle}`);
    console.log(`COURSE ID: ${courseIdMatch[1]}`);
    console.log(`FINAL URL: ${finalUrl}`);
    console.log(`MODULES: ${moduleCount}`);
    console.log(`SUBSCRIPTION USED: ${sawSubscription}`);
    console.log(`POLLING FALLBACK USED: ${sawPoll}`);
  } else {
    console.log('STATUS: PARTIAL — Outline shown but course creation/redirect failed');
    console.log(`FINAL URL: ${finalUrl}`);
    console.log(`COURSE TITLE: ${courseTitle}`);
  }

  console.log('=============================\n');
  console.log('[DONE] Screenshots: docs/screenshots/bug095-*.png');
  await browser.close();
  process.exit(courseIdMatch ? 0 : 1);
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });

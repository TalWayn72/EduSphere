/**
 * BUG-095 Verification E2E — AI Course Creation from /courses list page
 * Verifies end-to-end: login → /courses → AI modal → generate → outline → create draft
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';
const USER = 'instructor@example.com';
const PASS = 'Instructor123!';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const graphqlResponses = [];
  page.on('response', async (res) => {
    if (res.url().includes('/graphql') && res.request().method() === 'POST') {
      try {
        const body = await res.json().catch(() => null);
        const opName =
          JSON.parse(res.request().postData() || '{}').operationName ||
          'unknown';
        graphqlResponses.push({
          op: opName,
          data: body?.data,
          errors: body?.errors,
        });
        if (body?.errors?.length)
          console.log(`[GQL-ERR] ${opName}: ${body.errors[0].message}`);
      } catch {
        /* */
      }
    }
  });

  // ── Login via Keycloak ──────────────────────────────────────────────────
  console.log('Step 1: Login...');
  await page.goto(`${BASE}/courses`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  if (page.url().includes('/login')) {
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForURL('**/realms/**', { timeout: 10000 }).catch(() => {});
    await page.locator('#username').fill(USER);
    await page.locator('#password').fill(PASS);
    await page.locator('#kc-login, [type="submit"]').click();
    await page.waitForURL(`${BASE}/**`, { timeout: 15000 });
    await page.waitForTimeout(2000);
  }

  // ── Navigate to /courses ────────────────────────────────────────────────
  console.log('Step 2: Navigate to /courses...');
  await page.evaluate(() => {
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
  });
  await page.goto(`${BASE}/courses`, {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  console.log('URL:', page.url());

  // ── Click AI Create button ──────────────────────────────────────────────
  console.log('Step 3: Open AI modal...');
  await page.waitForTimeout(2000);
  const aiBtn = page.locator('button:has(svg.lucide-sparkles)').first();
  await aiBtn.click();
  await page.waitForTimeout(1000);

  // ── Fill topic and generate ─────────────────────────────────────────────
  console.log('Step 4: Fill topic and generate...');
  await page.locator('textarea').first().fill('Colors');
  // Click last button in modal that is not Cancel/Close
  const modalButtons = await page.locator('[role="dialog"] button').all();
  let genBtn = null;
  for (const btn of modalButtons) {
    const text = await btn.textContent();
    const disabled = await btn.isDisabled();
    if (
      !disabled &&
      text &&
      !text.includes('Close') &&
      !text.includes('ביטול') &&
      !text.includes('Cancel')
    ) {
      genBtn = btn;
    }
  }
  if (!genBtn) {
    console.error('No generate button found');
    await browser.close();
    process.exit(1);
  }
  await genBtn.click();
  console.log('Generate clicked');

  // ── Wait for outline ────────────────────────────────────────────────────
  console.log('Step 5: Waiting for outline (up to 5 min)...');
  const startTime = Date.now();
  let outlineAppeared = false;

  for (let i = 0; i < 60; i++) {
    // 60 * 5s = 5 min
    await page.waitForTimeout(5000);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const h3Count = await page.locator('[role="dialog"] h3').count();

    if (h3Count > 0) {
      console.log(`[${elapsed}s] Outline appeared with ${h3Count} h3 elements`);
      outlineAppeared = true;
      break;
    }

    const errorEl = page.locator('.text-destructive').first();
    if (await errorEl.isVisible().catch(() => false)) {
      const errText = await errorEl.textContent();
      console.log(`[${elapsed}s] ERROR: ${errText}`);
      break;
    }

    if (elapsed % 30 === 0)
      console.log(`[${elapsed}s] Still waiting... (RUNNING)`);
  }

  if (!outlineAppeared) {
    console.error('FAILED: Outline did not appear within 5 minutes');
    await page.screenshot({ path: 'docs/screenshots/bug095-final.png' });
    await browser.close();
    process.exit(1);
  }

  await page.screenshot({ path: 'docs/screenshots/bug095-outline.png' });

  // Get outline title
  const title = await page.locator('[role="dialog"] h3').first().textContent();
  console.log(`Outline title: "${title}"`);

  // ── Click Create Draft ──────────────────────────────────────────────────
  console.log('Step 6: Click Create Draft...');
  // Scroll modal to bottom to reveal buttons
  const dialog = page.locator('[role="dialog"]');
  await dialog.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/bug095-scrolled.png' });

  // Find all buttons after outline — the last non-outline buttons
  const allBtnsAfterOutline = await page
    .locator('[role="dialog"] button')
    .all();
  let draftBtn = null;
  for (const btn of allBtnsAfterOutline) {
    const text = await btn.textContent();
    const visible = await btn.isVisible().catch(() => false);
    console.log(`  Button: "${text}" visible=${visible}`);
    // The Create Draft button has CheckCircle2 icon and is the primary action
    if (
      visible &&
      text &&
      (text.includes('Create') ||
        text.includes('Draft') ||
        text.includes('טיוטה') ||
        text.includes('צור'))
    ) {
      // Skip regenerate/discard
      if (
        !text.includes('Regenerate') &&
        !text.includes('Discard') &&
        !text.includes('חזור') &&
        !text.includes('בטל') &&
        !text.includes('Close')
      ) {
        draftBtn = btn;
      }
    }
  }

  if (!draftBtn) {
    console.error('Create Draft button not found');
    await browser.close();
    process.exit(1);
  }

  console.log(`Clicking Create Draft: "${await draftBtn.textContent()}"`);
  await draftBtn.click();
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  console.log(`Final URL: ${finalUrl}`);

  // ── Verify ──────────────────────────────────────────────────────────────
  const courseCreated = /\/courses\/[0-9a-f-]+/.test(finalUrl);
  const createMutations = graphqlResponses.filter(
    (r) => r.op === 'CreateCourse'
  );

  console.log('\n========================================');
  console.log('BUG-095 VERIFICATION RESULTS');
  console.log('========================================');
  console.log(`Outline appeared: YES`);
  console.log(`Outline title: ${title}`);
  console.log(`CreateCourse mutations: ${createMutations.length}`);
  if (createMutations.length > 0) {
    const cd = createMutations[0].data?.createCourse;
    console.log(`  Course ID: ${cd?.id}`);
    console.log(`  Course title: ${cd?.title}`);
    if (createMutations[0].errors) {
      console.log(
        `  Errors: ${createMutations[0].errors.map((e) => e.message).join('; ')}`
      );
    }
  }
  console.log(`Redirected to course: ${courseCreated}`);
  console.log(`Final URL: ${finalUrl}`);
  console.log(
    `\nRESULT: ${courseCreated ? 'SUCCESS' : 'PARTIAL — outline worked, draft creation check below'}`
  );

  await page.screenshot({ path: 'docs/screenshots/bug095-final.png' });
  await browser.close();
  process.exit(courseCreated ? 0 : 1);
})().catch((err) => {
  console.error('CRASHED:', err);
  process.exit(1);
});

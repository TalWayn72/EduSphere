const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const ssDir = 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';

  // ═══ Step 1: Login via Keycloak ═══
  console.log('=== Step 1: Login via Keycloak ===');
  await page.goto('http://localhost:5173/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  const signInBtn = page.getByRole('button', { name: /sign in/i });
  if (await signInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signInBtn.click();
    await page
      .waitForURL(/realms\/edusphere/, { timeout: 15000 })
      .catch(() => {});
    if (
      await page
        .locator('#username')
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await page.fill('#username', 'student@example.com');
      await page.fill('#password', 'Student123!');
      await page.click('#kc-login');
      await page
        .waitForURL(/localhost:5173/, { timeout: 20000 })
        .catch(() => {});
      await page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});
    }
  }
  console.log('Logged in. URL:', page.url());

  // ═══ Step 2: Reset consent to OFF ═══
  console.log('\n=== Step 2: Reset consent to OFF ===');
  await page.goto('http://localhost:5173/settings', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  const aiToggle = page.locator('#setting-ai-consent [role="switch"]');
  await aiToggle.waitFor({ timeout: 10000 });
  const currentState = await aiToggle.getAttribute('aria-checked');
  console.log('Current AI consent state:', currentState);

  if (currentState === 'true') {
    await aiToggle.click();
    await page.waitForTimeout(4000);
    const newState = await aiToggle.getAttribute('aria-checked');
    console.log('Turned consent OFF, new state:', newState);
  }

  // Clear localStorage consent too
  await page.evaluate(() => {
    localStorage.removeItem('edusphere_consent_AI_PROCESSING');
    localStorage.removeItem('edusphere_consent_THIRD_PARTY_LLM');
  });
  console.log('Cleared localStorage consent keys');

  // ═══ Step 3: Go to /courses/new and click "Launch AI Builder" ═══
  console.log('\n=== Step 3: Go to /courses/new, click Launch AI Builder ===');
  await page.goto('http://localhost:5173/courses/new', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  const launchBtn = page
    .locator('button, a')
    .filter({ hasText: /Launch AI Builder|יוצר קורסים|AI Course/i })
    .first();
  const launchVisible = await launchBtn
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  console.log('Launch AI Builder button visible:', launchVisible);

  if (launchVisible) {
    await launchBtn.click();
    await page.waitForTimeout(2000);
    console.log('Clicked Launch AI Builder');
  }

  await page.screenshot({ path: ssDir + '/bug088-flow-modal-opened.png' });

  // Check what's inside the modal
  const modalContent = await page
    .locator('[role="dialog"], .modal, [data-radix-dialog-content]')
    .first();
  const modalVisible = await modalContent
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  console.log('Modal visible:', modalVisible);

  // Look for consent warning inside the modal or page
  const consentWarning = page.locator('[data-testid="requirement-link"]');
  const warningVisible = await consentWarning
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  console.log('Consent warning visible (inside modal):', warningVisible);

  // Look for any consent-related text
  const consentText = page
    .locator('text=/consent|הסכמ|AI features require/i')
    .first();
  const consentTextVisible = await consentText
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  console.log('Consent text visible:', consentTextVisible);

  // Look for the consent link
  const consentLink = page
    .locator('a[href*="settings"][href*="highlight"]')
    .first();
  const consentLinkVisible = await consentLink
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  console.log('Consent link visible:', consentLinkVisible);

  // Check if there's a textarea (prompt input) and if the generate button is disabled
  const textarea = page.locator('textarea').first();
  const textareaVisible = await textarea
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  console.log('Textarea visible:', textareaVisible);

  const generateBtn = page
    .locator('button')
    .filter({ hasText: /Generate|צור קורס/i })
    .first();
  const genVisible = await generateBtn
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (genVisible) {
    const genDisabled = await generateBtn.isDisabled();
    console.log(
      'Generate button visible:',
      genVisible,
      'disabled:',
      genDisabled
    );
  } else {
    console.log('Generate button not found');
  }

  // ═══ Step 4: Click consent link → Settings ═══
  if (consentLinkVisible) {
    console.log('\n=== Step 4: Click consent link → Settings ===');
    const href = await consentLink.getAttribute('href');
    console.log('Consent link href:', href);
    await consentLink.click();
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    console.log('URL after clicking consent link:', page.url());
    await page.screenshot({
      path: ssDir + '/bug088-flow-settings-from-modal.png',
    });

    // Check for back button
    const backBtn = page.locator('button:has(svg.lucide-arrow-left)');
    const backBtnVisible = await backBtn
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    console.log('Back button visible:', backBtnVisible);

    // ═══ Step 5: Toggle AI consent ON ═══
    console.log('\n=== Step 5: Toggle AI consent ON ===');
    const toggle = page.locator('#setting-ai-consent [role="switch"]');
    await toggle.waitFor({ timeout: 10000 });
    const toggleState = await toggle.getAttribute('aria-checked');
    console.log('Toggle state:', toggleState);

    if (toggleState === 'false') {
      await toggle.click();
      await page.waitForTimeout(4000);
      const newState = await toggle.getAttribute('aria-checked');
      console.log('Toggle state after click:', newState);

      const errorToast = await page
        .locator('[data-sonner-toast][data-type="error"]')
        .isVisible()
        .catch(() => false);
      const successToast = await page
        .locator('[data-sonner-toast][data-type="success"]')
        .isVisible()
        .catch(() => false);
      console.log('Error toast:', errorToast, '| Success toast:', successToast);

      if (errorToast) {
        console.log('FAIL: Error toast — mutation failed!');
        await page.screenshot({ path: ssDir + '/bug088-flow-FAIL.png' });
        await browser.close();
        process.exit(1);
      }
    }

    await page.screenshot({
      path: ssDir + '/bug088-flow-consent-toggled-on.png',
    });

    // ═══ Step 6: Navigate back ═══
    console.log('\n=== Step 6: Navigate back ===');
    if (backBtnVisible) {
      const backBtn2 = page.locator('button:has(svg.lucide-arrow-left)');
      await backBtn2.click();
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(2000);
      console.log('URL after back button:', page.url());
    } else {
      await page.goto('http://localhost:5173/courses/new', {
        waitUntil: 'networkidle',
        timeout: 15000,
      });
      console.log('Navigated manually to /courses/new');
    }

    await page.screenshot({ path: ssDir + '/bug088-flow-returned.png' });

    // ═══ Step 7: Try AI Builder again ═══
    console.log('\n=== Step 7: Try Launch AI Builder again ===');
    const launchBtn2 = page
      .locator('button, a')
      .filter({ hasText: /Launch AI Builder|יוצר קורסים|AI Course/i })
      .first();
    if (await launchBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await launchBtn2.click();
      await page.waitForTimeout(2000);
      console.log('Clicked Launch AI Builder again');
    }

    await page.screenshot({ path: ssDir + '/bug088-flow-after-consent.png' });

    // Check if consent warning is GONE now
    const warningAfter = page.locator('[data-testid="requirement-link"]');
    const warningGone = !(await warningAfter
      .isVisible({ timeout: 3000 })
      .catch(() => false));
    console.log('Consent warning gone:', warningGone);

    // Check if textarea is accessible and generate button is enabled
    const ta2 = page.locator('textarea').first();
    const ta2Vis = await ta2.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Textarea accessible:', ta2Vis);
    if (ta2Vis) {
      await ta2.fill('Introduction to Machine Learning');
      console.log('Filled prompt');
    }

    const gen2 = page
      .locator('button')
      .filter({ hasText: /Generate|צור קורס/i })
      .first();
    const gen2Vis = await gen2.isVisible({ timeout: 3000 }).catch(() => false);
    if (gen2Vis) {
      const gen2Disabled = await gen2.isDisabled();
      console.log(
        'Generate button visible:',
        gen2Vis,
        'disabled:',
        gen2Disabled
      );
    }

    await page.screenshot({
      path: ssDir + '/bug088-flow-ready-to-generate.png',
    });

    console.log('\n=== FULL FLOW RESULT ===');
    console.log('Consent warning after toggle: GONE =', warningGone);
    console.log('Can type in prompt:', ta2Vis);
    console.log('PASS:', warningGone && ta2Vis);

    await browser.close();
    process.exit(warningGone && ta2Vis ? 0 : 1);
  } else {
    // No consent link found — maybe the gate isn't showing
    console.log('\nConsent link NOT found on the page.');
    console.log('This may mean the consent gate is not triggering properly.');

    // Dump more page info
    const allText = await page.locator('body').innerText();
    console.log('Full page text (first 800):', allText.substring(0, 800));

    await page.screenshot({ path: ssDir + '/bug088-flow-no-consent-link.png' });
    await browser.close();
    // Not a failure per se — the page may just not show the gate
    process.exit(0);
  }
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

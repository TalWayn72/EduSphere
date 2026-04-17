const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const ssDir = 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';

  let mutationSent = false;
  let mutationResult = null;

  page.on('response', async (resp) => {
    if (resp.url().includes('/graphql')) {
      try {
        const body = await resp.json();
        if (body && body.data && body.data.updateConsent !== undefined) {
          mutationResult = body;
          console.log('MUTATION RESULT:', JSON.stringify(body));
        }
      } catch (e) {
        /* ignore */
      }
    }
  });

  page.on('request', (req) => {
    if (req.url().includes('/graphql')) {
      try {
        const pd = req.postDataJSON();
        if (
          pd &&
          pd.query &&
          (pd.query.includes('updateConsent') ||
            pd.query.includes('UpdateConsent'))
        ) {
          mutationSent = true;
          console.log('MUTATION SENT:', JSON.stringify(pd).substring(0, 300));
        }
      } catch (e) {
        /* ignore */
      }
    }
  });

  // Step 1: Login via Keycloak
  console.log('Step 1: Login via Keycloak...');
  await page.goto('http://localhost:5173/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Wait for Keycloak init to finish
  await page.waitForTimeout(3000);

  // Click Sign In button
  const signInBtn = page.getByRole('button', { name: /sign in/i });
  const signInVisible = await signInBtn
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (signInVisible) {
    await signInBtn.click();
    console.log('Clicked Sign In button');

    // Wait for Keycloak login form
    await page
      .waitForURL(/realms\/edusphere/, { timeout: 15000 })
      .catch(() => {});

    // Fill credentials
    const usernameField = page.locator('#username');
    const usernameVisible = await usernameField
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (usernameVisible) {
      await page.fill('#username', 'student@example.com');
      await page.fill('#password', 'Student123!');
      await page.click('#kc-login');
      console.log('Submitted Keycloak credentials');

      // Wait for redirect back to app
      await page
        .waitForURL(/localhost:5173/, { timeout: 20000 })
        .catch(() => {});
      await page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});
    }
  } else {
    // Try dev mode login
    console.log('Sign In button not found, trying dev mode...');
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    const devVisible = await devBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (devVisible) {
      await devBtn.click();
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(() => {});
    }
  }

  console.log('Current URL after login:', page.url());
  await page.screenshot({ path: ssDir + '/bug088-r2-after-login.png' });

  // Step 2: Navigate to Settings
  console.log('Step 2: Navigate to /settings');
  await page.goto('http://localhost:5173/settings', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: ssDir + '/bug088-r2-settings-loaded.png' });

  // Step 3: Find the AI consent toggle
  const toggle = page.locator('#setting-ai-consent [role="switch"]');
  const isVisible = await toggle
    .isVisible({ timeout: 10000 })
    .catch(() => false);
  console.log('Toggle visible:', isVisible);

  if (!isVisible) {
    // Try scrolling down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    const isVisibleAfterScroll = await toggle.isVisible().catch(() => false);
    console.log('Toggle visible after scroll:', isVisibleAfterScroll);

    if (!isVisibleAfterScroll) {
      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => 'EMPTY');
      console.log('Page text (first 500):', bodyText.substring(0, 500));
      await page.screenshot({ path: ssDir + '/bug088-r2-debug.png' });
      await browser.close();
      process.exit(1);
    }
  }

  const beforeState = await toggle.getAttribute('aria-checked');
  console.log('Toggle state before click:', beforeState);

  // Step 4: Click the toggle
  console.log('Step 4: Clicking AI consent toggle...');
  await toggle.click();
  await page.waitForTimeout(4000);

  const afterState = await toggle.getAttribute('aria-checked');
  console.log('Toggle state after click:', afterState);

  // Step 5: Check for toasts
  const errorToast = await page
    .locator('[data-sonner-toast][data-type="error"]')
    .isVisible()
    .catch(() => false);
  const successToast = await page
    .locator('[data-sonner-toast][data-type="success"]')
    .isVisible()
    .catch(() => false);
  console.log('Error toast visible:', errorToast);
  console.log('Success toast visible:', successToast);

  await page.screenshot({ path: ssDir + '/bug088-r2-after-toggle.png' });
  console.log('Screenshot: after toggle click');

  // Summary
  console.log('\n=== VISUAL VERIFICATION SUMMARY ===');
  console.log('Mutation sent:', mutationSent);
  console.log('Mutation result:', JSON.stringify(mutationResult));
  console.log('Toggle changed:', beforeState !== afterState);
  console.log('Error toast:', errorToast);
  console.log('Success toast:', successToast);

  const passed =
    mutationSent &&
    mutationResult &&
    mutationResult.data &&
    mutationResult.data.updateConsent === true &&
    !errorToast;
  console.log('OVERALL PASS:', !!passed);

  await browser.close();
  process.exit(passed ? 0 : 1);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

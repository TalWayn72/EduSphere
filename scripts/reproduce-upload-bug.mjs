import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const SCREENSHOT_DIR = 'docs/screenshots';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const networkErrors = [];
  const presignedResponses = [];

  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('requestfailed', (req) => {
    networkErrors.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  page.on('response', async (resp) => {
    if (resp.url().includes('/graphql') && resp.request().method() === 'POST') {
      try {
        const postData = resp.request().postData() || '';
        if (postData.includes('resigned')) {
          const body = await resp.text();
          presignedResponses.push({
            status: resp.status(),
            body: body.substring(0, 1000),
            authHeader: (
              resp.request().headers()['authorization'] || 'NONE'
            ).substring(0, 50),
          });
        }
      } catch {}
    }
  });

  // 1. Navigate — triggers Keycloak redirect
  console.log('1. Navigating...');
  await page.goto('http://localhost:5173', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });

  // 2. Fill Keycloak login form if present
  if (page.url().includes('realms/edusphere')) {
    console.log('2. Keycloak login...');
    await page.fill('#username', 'instructor@example.com');
    await page.fill('#password', 'Instructor123!');
    await page.click('#kc-login');
    await page
      .waitForURL('**/localhost:5173/**', { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
  }
  console.log('   URL:', page.url());

  // 3. Go to course creation
  console.log('3. /courses/new...');
  await page.goto('http://localhost:5173/courses/new', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  await page.waitForTimeout(1000);

  // 4. Fill step 1 title (find the first text input)
  console.log('4. Fill title...');
  const inputs = page.locator('input[type="text"], input:not([type])');
  const inputCount = await inputs.count();
  console.log(`   Found ${inputCount} text inputs`);
  if (inputCount > 0) {
    await inputs.first().fill('Test Course Upload Bug');
    await page.waitForTimeout(500);
  }

  // Click Next
  const nextBtns = page.locator('button').filter({ hasText: /הבא|Next/ });
  if ((await nextBtns.count()) > 0) {
    await nextBtns.first().click();
    await page.waitForTimeout(1000);
  }

  // 5. Click Next again (step 2 → step 3)
  console.log('5. Step 2 → 3...');
  const nextBtns2 = page.locator('button').filter({ hasText: /הבא|Next/ });
  if ((await nextBtns2.count()) > 0) {
    await nextBtns2.first().click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bug-upload-step3.png` });

  // 6. Upload file
  console.log('6. Upload PDF...');
  mkdirSync('C:/tmp', { recursive: true });
  writeFileSync(
    'C:/tmp/test-upload.pdf',
    '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF'
  );

  const fileChooserPromise = page.waitForEvent('filechooser', {
    timeout: 5000,
  });
  await page.locator('.border-dashed').first().click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles('C:/tmp/test-upload.pdf');
  await page.waitForTimeout(1000);

  // 7. Click Upload
  console.log('7. Click Upload...');
  const uploadBtn = page
    .locator('button')
    .filter({ hasText: /העלה|Upload/ })
    .first();
  const uploadBtnVisible = await uploadBtn.isVisible().catch(() => false);
  console.log('   Upload button visible:', uploadBtnVisible);
  if (uploadBtnVisible) {
    await uploadBtn.click();
    await page.waitForTimeout(5000);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bug-upload-result.png` });

  // Results
  console.log('\n===== RESULTS =====');
  const errorTexts = await page.locator('.text-destructive').allTextContents();
  console.log('Errors on page:', errorTexts);

  const progressBars = await page.locator('.bg-primary.h-1\\.5').count();
  console.log('Progress bars:', progressBars);

  console.log('\nPresigned URL responses:');
  presignedResponses.forEach((r, i) => {
    console.log(`  [${i}] Status: ${r.status}`);
    console.log(`      Auth: ${r.authHeader}`);
    console.log(`      Body: ${r.body}`);
  });

  console.log('\nNetwork errors:', networkErrors);
  console.log(
    '\nConsole errors:',
    consoleMessages.filter((m) => m.includes('[error]')).slice(-5)
  );

  // Check token state
  const tokenInfo = await page.evaluate(() => {
    const devLoggedIn = window.sessionStorage.getItem(
      'edusphere_dev_logged_in'
    );
    return { devLoggedIn, url: window.location.href };
  });
  console.log('\nToken info:', tokenInfo);

  await browser.close();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});

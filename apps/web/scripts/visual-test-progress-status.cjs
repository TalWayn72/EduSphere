/**
 * Visual test: ProgressStatus indicator in AI Course Creator Modal.
 * Uses route interception to simulate slow AI generation.
 * Takes rapid screenshots to capture cycling text.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Promise that we control to hold the mock response
  let resolveMock;
  const mockHold = new Promise(r => { resolveMock = r; });

  try {
    // 1. Login flow
    console.log('1. Logging in...');
    await page.goto(`${BASE_URL}/login`, { timeout: 30000, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const kcBtn = page.locator('button:has-text("Keycloak"), button:has-text("Sign In")').first();
    if (await kcBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await kcBtn.click();
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('/login')) {
      const btn = page.locator('button:has-text("Keycloak")').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(2000);
      }
    }
    if (page.url().includes('keycloak') || page.url().includes(':8080')) {
      await page.waitForSelector('#username', { timeout: 15000 });
      await page.fill('#username', 'instructor@example.com');
      await page.fill('#password', 'Instructor123!');
      await page.click('#kc-login');
      await page.waitForURL(u => !u.href.includes('keycloak'), { timeout: 30000 });
      await page.waitForTimeout(2000);
    }
    console.log('   Logged in:', page.url());

    await page.evaluate(() => {
      localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
      localStorage.setItem('edusphere_consent_THIRD_PARTY_LLM', 'true');
    });

    // 2. Set up route intercept - hold the response until we release it
    console.log('2. Setting up GraphQL intercept...');
    await page.route('**/graphql', async (route) => {
      const postData = route.request().postData();
      if (postData && postData.includes('generateCourseFromPrompt')) {
        console.log('   [INTERCEPT] Holding generateCourseFromPrompt...');
        // Wait until main code releases the hold
        await mockHold;
        console.log('   [INTERCEPT] Releasing mock response');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              generateCourseFromPrompt: {
                executionId: 'mock-exec-id',
                status: 'COMPLETED',
                courseTitle: 'Introduction to Machine Learning',
                courseDescription: 'A comprehensive ML course.',
                modules: [
                  { title: 'Foundations', description: 'Core concepts', contentItemTitles: ['What is ML?', 'Types'] },
                  { title: 'Supervised Learning', description: 'Classification', contentItemTitles: ['Regression', 'Trees'] },
                  { title: 'Neural Networks', description: 'Deep learning', contentItemTitles: ['Perceptrons', 'CNNs'] },
                ],
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    // 3. Navigate to /courses/new and open modal
    console.log('3. Opening AI modal...');
    await page.goto(`${BASE_URL}/courses/new`, { timeout: 20000, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const aiBtn = page.locator('button:has-text("AI"), button:has-text("Builder"), button:has-text("בונה")').first();
    await aiBtn.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   Modal open!');

    // 4. Fill and generate
    console.log('4. Filling topic and generating...');
    await dialog.locator('textarea').first().fill('Introduction to Machine Learning');
    await page.waitForTimeout(300);

    const genBtn = dialog.locator('button:has-text("Generate"), button:has-text("צור")').first();
    // Don't await click result — it fires the mutation which will be held
    await genBtn.click();
    console.log('   Generate clicked!');

    // 5. Rapid monitoring — check every second for 15 seconds
    console.log('\n5. === MONITORING ProgressStatus ===');
    const seenTexts = new Set();
    let progressWorking = false;

    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);

      const statusTexts = await page.locator('[role="status"]').allTextContents().catch(() => []);
      statusTexts.forEach(t => { if (t.trim()) seenTexts.add(t.trim()); });

      const spinCount = await dialog.locator('[aria-hidden="true"]').count().catch(() => 0);
      const btnDisabled = await genBtn.isDisabled().catch(() => false);
      const btnText = await genBtn.textContent().catch(() => '');

      if (statusTexts.length > 0) progressWorking = true;

      console.log(`   [t+${i + 1}s] status: ${JSON.stringify(statusTexts.map(t => t.trim()))} btn: "${btnText.trim()}" disabled: ${btnDisabled}`);

      // Take screenshot at key moments
      if (i === 0 || i === 3 || i === 6 || i === 9 || i === 12) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `progress-gen-${String(i).padStart(2, '0')}.png`) });
      }

      // Check if outline appeared (shouldn't — mock is held)
      if (await dialog.locator('h3').isVisible().catch(() => false)) {
        console.log('   Outline appeared early!');
        break;
      }
    }

    console.log(`\n   === INTERIM RESULTS ===`);
    console.log(`   Unique texts seen: ${JSON.stringify([...seenTexts])}`);
    console.log(`   ProgressStatus renders: ${progressWorking ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   Text cycling (>1 unique): ${seenTexts.size > 1 ? 'YES ✓' : 'NO ✗'}`);

    // Take a screenshot showing the progress state
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'progress-generating-proof.png') });

    // 6. Release mock — should show outline
    console.log('\n6. Releasing mock response...');
    resolveMock();
    await page.waitForTimeout(3000);

    const outlineVisible = await dialog.locator('h3').isVisible().catch(() => false);
    if (outlineVisible) {
      const title = await dialog.locator('h3').textContent();
      console.log(`   SUCCESS: Course outline: "${title}"`);
    } else {
      console.log('   WARNING: No outline appeared after releasing mock');
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'progress-07-success.png') });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'progress-final.png') });

    console.log(`\n   === FINAL SUMMARY ===`);
    console.log(`   ProgressStatus renders: ${progressWorking ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   Text cycling detected: ${seenTexts.size > 1 ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   Unique messages: ${JSON.stringify([...seenTexts])}`);
    console.log(`   Course generated: ${outlineVisible ? 'YES ✓' : 'NO ✗'}`);
    console.log('\nDone.');

  } catch (err) {
    console.error('FAIL:', err.message);
    // Make sure to release mock so route handler doesn't hang
    if (resolveMock) resolveMock();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'progress-ERROR.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run().catch(console.error);

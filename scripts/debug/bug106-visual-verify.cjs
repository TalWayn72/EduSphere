// BUG-106: Visual verification of Pipeline page - check for 400 errors
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:5173';
const COURSE_ID = '8215514d-f96a-467e-92a1-042ad687c69e'; // Verify Course 1

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  const graphqlBodies = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('response', async response => {
    if (response.status() >= 400) {
      let body = '';
      try { body = await response.text(); } catch {}
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        body: body.substring(0, 300)
      });
    }
  });

  try {
    // Login via Keycloak
    console.log('[1] Login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('button:has-text("Keycloak")').first().click();
    await page.waitForURL(url => url.toString().includes('8080'), { timeout: 10000 });
    await page.fill('#username', 'instructor@example.com');
    await page.fill('#password', 'Instructor123!');
    await page.click('#kc-login');
    await page.waitForURL(url => url.toString().includes('localhost:5173'), { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('  Logged in:', page.url());

    // Go to course detail to find lesson ID
    console.log('[2] Course detail');
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Find all links on the page, especially lesson-related
    const allHrefs = await page.locator('a[href]').evaluateAll(els =>
      els.map(el => el.getAttribute('href')).filter(Boolean)
    );
    console.log('  All hrefs:', allHrefs.filter(h => h.includes('lesson') || h.includes('pipeline')));

    // Try to find lesson text/link - the lesson row "שיעור שער הכוונות - מ"ז"
    // Click on the lesson row/text
    const lessonRow = page.locator('text=שיעור שער הכוונות');
    if (await lessonRow.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  Found lesson row, clicking');
      await lessonRow.first().click();
      await page.waitForTimeout(3000);
      console.log('  After click URL:', page.url());
    }

    // Extract lesson ID from URL
    let lessonId = null;
    const lessonMatch = page.url().match(/lessons\/([a-f0-9-]+)/i);
    if (lessonMatch) {
      lessonId = lessonMatch[1];
      console.log('  Lesson ID:', lessonId);
    }

    // If we didn't get a lesson ID from navigation, try to extract it from the page
    if (!lessonId) {
      // Look for any lesson links on the page
      const lessonLinks = await page.locator('a[href*="lessons/"]').evaluateAll(els =>
        els.map(el => el.getAttribute('href')).filter(Boolean)
      );
      console.log('  Lesson links found:', lessonLinks);
      if (lessonLinks.length > 0) {
        const m = lessonLinks[0].match(/lessons\/([a-f0-9-]+)/i);
        if (m) lessonId = m[1];
      }
    }

    // If still no lesson ID, try querying GraphQL for lessons
    if (!lessonId) {
      console.log('  No lesson ID found via navigation, trying GraphQL query...');
      const resp = await page.evaluate(async (courseId) => {
        try {
          const token = localStorage.getItem('kc_token') || sessionStorage.getItem('kc_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const r = await fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: `query { lessons(courseId: "${courseId}", first: 5) { edges { node { id title } } } }`
            })
          });
          return await r.text();
        } catch (e) {
          return e.message;
        }
      }, COURSE_ID);
      console.log('  GraphQL response:', resp.substring(0, 300));
    }

    // Take intermediate screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug106-lesson-detail.png'), fullPage: true });

    // Navigate to pipeline page
    if (lessonId) {
      console.log(`[3] Pipeline page: /courses/${COURSE_ID}/lessons/${lessonId}/pipeline`);
      // Clear error tracking
      const errorsBefore = networkErrors.length;

      await page.goto(`${BASE_URL}/courses/${COURSE_ID}/lessons/${lessonId}/pipeline`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      await page.waitForTimeout(3000);

      const pipelineErrors = networkErrors.slice(errorsBefore);
      console.log(`  Pipeline page errors: ${pipelineErrors.length}`);
      pipelineErrors.forEach(e => console.log(`    ${e.status}: ${e.body.substring(0, 150)}`));
    } else {
      // No lesson ID - try the first course's pipeline builder as fallback
      console.log('[3] No lesson found — trying pipeline builder');
      await page.goto(`${BASE_URL}/courses/${COURSE_ID}/pipeline/builder`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      await page.waitForTimeout(3000);
    }

    console.log('  Final URL:', page.url());

    // Analyze
    const pageContent = await page.textContent('body');
    const hasCannotQuery = pageContent.includes('Cannot query field');
    const hasRawError = pageContent.includes('Error:') && pageContent.includes('Cannot');

    console.log('\n=== NETWORK ERRORS (400+) ===');
    if (networkErrors.length === 0) {
      console.log('  None!');
    } else {
      networkErrors.forEach(e => {
        console.log(`  ${e.status}: ${e.url.substring(0, 100)}`);
        if (e.body.includes('Cannot query')) console.log(`    Body: ${e.body.substring(0, 200)}`);
      });
    }

    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach(e => console.log(`  ${e.substring(0, 200)}`));
    if (consoleErrors.length === 0) console.log('  None!');

    console.log('\n=== VISIBLE ERROR TEXT ===');
    console.log(`  "Cannot query field" visible: ${hasCannotQuery}`);

    const keywords = ['Ingestion', 'Transcription', 'NER', 'Content Cleaning', 'Pipeline', 'pipeline', 'Stage', 'Processing', 'INGESTION', 'ASR'];
    console.log('\n=== PIPELINE CONTENT ===');
    for (const kw of keywords) {
      if (pageContent.includes(kw)) console.log(`  "${kw}": YES`);
    }
    const foundAny = keywords.some(k => pageContent.includes(k));
    if (!foundAny) console.log('  No pipeline keywords found on page');

    // Take final screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, 'bug106-pipeline-fixed.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nScreenshot saved: ${screenshotPath}`);

    const gqlErrors = networkErrors.filter(e => e.url.includes('graphql') || e.url.includes('4000'));
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Network errors (400+): ${networkErrors.length}`);
    console.log(`GraphQL errors: ${gqlErrors.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`"Cannot query field" visible: ${hasCannotQuery}`);
    console.log(`Pipeline content: ${foundAny ? 'YES' : 'NO'}`);
    console.log(`Final URL: ${page.url()}`);
    console.log('========================================');

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug106-pipeline-ERROR.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();

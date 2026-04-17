const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5176';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  await devBtn.waitFor({ timeout: 10000 });
  await devBtn.click();
  await page
    .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  console.log('--- LOGIN COMPLETE ---');

  // Set up route mock BEFORE navigation
  await page.route('**/graphql', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }

    let parsed = {};
    try {
      parsed = JSON.parse(req.postData() || '{}');
    } catch {}
    const opName = parsed.operationName || '';

    if (
      opName === 'Courses' ||
      (parsed.query && parsed.query.includes('courses('))
    ) {
      const response = JSON.stringify({
        data: {
          courses: [
            {
              id: 'test1',
              title: 'MOCK COURSE XYZ',
              slug: 'mock',
              description: 'test',
              isPublished: true,
              estimatedHours: 5,
              thumbnailUrl: null,
              instructorId: 'dev-user-id',
              __typename: 'Course',
            },
          ],
        },
      });
      console.log('  -> RETURNING:', response);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: response,
      });
      return;
    }

    // Let everything else return empty
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ data: {} }),
    });
  });
  console.log('--- MOCK REGISTERED ---');

  // Navigate to courses
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
  console.log('--- NAVIGATED ---');

  // Wait for content
  await page.waitForTimeout(5000);

  // Check what React rendered
  const html = await page.innerHTML('main');
  console.log('--- MAIN HTML (first 500 chars):', html.substring(0, 500));
  console.log(
    '--- Contains MOCK COURSE XYZ:',
    html.includes('MOCK COURSE XYZ')
  );
  console.log('--- Contains No courses:', html.includes('No courses'));

  // Try evaluating urql state
  try {
    const result = await page.evaluate(() => {
      // Check if there's any console errors
      return (
        document.querySelector('main')?.textContent?.substring(0, 200) ||
        'NO MAIN FOUND'
      );
    });
    console.log('--- Text content:', result);
  } catch (e) {
    console.log('--- Eval error:', e.message);
  }

  await page.screenshot({
    path: 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug103-debug2.png',
  });

  await browser.close();
})();

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5176';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor all requests
  page.on('request', (req) => {
    if (req.url().includes('graphql')) {
      console.log(`[REQ] ${req.method()} ${req.url()}`);
      try {
        const body = JSON.parse(req.postData() || '{}');
        console.log(`  operationName: ${body.operationName}`);
      } catch {}
    }
  });

  page.on('response', (resp) => {
    if (resp.url().includes('graphql')) {
      console.log(`[RESP] ${resp.status()} ${resp.url()}`);
    }
  });

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

  // Set up route mock
  await page.route('**/graphql', async (route) => {
    const req = route.request();
    console.log(`[INTERCEPTED] ${req.method()} ${req.url()}`);

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
    console.log(`  opName: "${opName}"`);

    if (
      opName === 'Courses' ||
      (parsed.query && parsed.query.includes('courses('))
    ) {
      console.log('  -> RETURNING MOCK COURSES');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            courses: [
              {
                id: 'test1',
                title: 'MOCK COURSE',
                slug: 'mock',
                description: 'test',
                isPublished: true,
                estimatedHours: 5,
                thumbnailUrl: null,
                instructorId: 'dev-user-id',
              },
            ],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
  console.log('--- MOCK REGISTERED ---');

  // Navigate to courses
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  console.log('--- NAVIGATED TO /courses ---');

  // Wait a bit and check
  await page.waitForTimeout(5000);
  const content = await page.textContent('body');
  console.log('--- MOCK COURSE found:', content.includes('MOCK COURSE'));
  console.log('--- No courses found:', content.includes('No courses'));

  await page.screenshot({
    path: 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug103-debug.png',
  });

  await browser.close();
})();

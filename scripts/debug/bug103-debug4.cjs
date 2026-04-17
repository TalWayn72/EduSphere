const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5176';
const COURSE_ID = '00000000-0000-0000-0000-bug103delete1';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let deleteWasCalled = false;

  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="dev-login-btn"]').click();
  await page
    .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');

  // Use routeGraphQL-style mock
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
    if (req.method() !== 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
      return;
    }
    let parsed = {};
    try {
      parsed = JSON.parse(req.postData() || '{}');
    } catch {}
    const opName = parsed.operationName || '';
    const queryStr = String(parsed.query || '');
    console.log(`[MOCK] ${opName}`);

    if (
      opName === 'CourseDetail' ||
      opName === 'GetCourse' ||
      opName === 'Course'
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            course: {
              __typename: 'Course',
              id: COURSE_ID,
              title: 'Course To Be Deleted',
              slug: 'course-to-delete',
              description: 'test',
              thumbnailUrl: null,
              estimatedHours: 5,
              isPublished: false,
              instructorId: 'dev-user-id',
              modules: [],
            },
          },
        }),
      });
    }
    if (opName === 'DeleteCourse' || queryStr.includes('deleteCourse')) {
      deleteWasCalled = true;
      console.log('  --> DELETE CALLED');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { deleteCourse: true } }),
      });
    }
    if (opName === 'Courses' || queryStr.includes('courses(')) {
      const courses = deleteWasCalled
        ? [
            {
              __typename: 'Course',
              id: 'keep1',
              title: 'Course That Stays',
              slug: 'stays',
              description: 'stays',
              isPublished: true,
              estimatedHours: 10,
              thumbnailUrl: null,
              instructorId: 'dev-user-id',
            },
          ]
        : [
            {
              __typename: 'Course',
              id: COURSE_ID,
              title: 'Course To Be Deleted',
              slug: 'course-to-delete',
              description: 'test',
              isPublished: false,
              estimatedHours: 5,
              thumbnailUrl: null,
              instructorId: 'dev-user-id',
            },
            {
              __typename: 'Course',
              id: 'keep1',
              title: 'Course That Stays',
              slug: 'stays',
              description: 'stays',
              isPublished: true,
              estimatedHours: 10,
              thumbnailUrl: null,
              instructorId: 'dev-user-id',
            },
          ];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { courses } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });

  // Navigate to course detail
  await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('domcontentloaded');

  // Delete flow
  const deleteBtn = page.getByTestId('delete-course-btn');
  await deleteBtn.waitFor({ timeout: 10000 });
  await deleteBtn.click();

  const dialog = page.getByTestId('delete-course-dialog');
  await dialog.waitFor({ timeout: 5000 });
  await page
    .getByTestId('delete-course-confirm-input')
    .fill('Course To Be Deleted');

  const confirmBtn = page.getByTestId('delete-course-confirm-btn');
  // Wait for button to become enabled
  let retries = 0;
  while (retries < 20 && !(await confirmBtn.isEnabled())) {
    await page.waitForTimeout(100);
    retries++;
  }
  console.log('Confirm enabled after', retries * 100, 'ms');
  await confirmBtn.click();

  // Wait for navigation
  try {
    await page.waitForURL(
      (url) => {
        const p = new URL(url).pathname;
        const match = p === '/courses' || p === '/courses/';
        console.log(`  URL check: "${p}" match=${match}`);
        return match;
      },
      { timeout: 10000 }
    );
    console.log('URL matched /courses');
  } catch (e) {
    console.log('URL timeout! Current URL:', page.url());
  }

  await page.waitForTimeout(2000);
  console.log('Final URL:', page.url());

  const mainText = await page.locator('main').textContent();
  console.log(
    'Contains "Course To Be Deleted":',
    mainText.includes('Course To Be Deleted')
  );
  console.log(
    'Contains "Course That Stays":',
    mainText.includes('Course That Stays')
  );
  console.log('deleteWasCalled:', deleteWasCalled);

  await page.screenshot({
    path: 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug103-debug4.png',
  });
  await browser.close();
})();

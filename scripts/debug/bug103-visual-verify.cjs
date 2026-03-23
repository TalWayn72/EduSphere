const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5176';
const COURSE_ID = 'visual-verify-delete-1';
const SCREENSHOTS = 'docs/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="dev-login-btn"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');

  let deleteWasCalled = false;

  await page.route('**/graphql', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization' }, body: '' });
      return;
    }
    if (req.method() !== 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      return;
    }
    let parsed = {};
    try { parsed = JSON.parse(req.postData() || '{}'); } catch {}
    const opName = parsed.operationName || '';
    const queryStr = String(parsed.query || '');

    const courseA = { __typename: 'Course', id: COURSE_ID, title: 'Introduction to Machine Learning', slug: 'intro-ml', description: 'Learn ML fundamentals with hands-on projects', isPublished: true, estimatedHours: 20, thumbnailUrl: null, instructorId: 'dev-user-id' };
    const courseB = { __typename: 'Course', id: 'keep-1', title: 'Advanced Database Systems', slug: 'adv-db', description: 'Deep dive into distributed databases and query optimization', isPublished: true, estimatedHours: 15, thumbnailUrl: null, instructorId: 'dev-user-id' };
    const courseC = { __typename: 'Course', id: 'keep-2', title: 'Web Development Bootcamp', slug: 'web-dev', description: 'Full-stack web development from scratch', isPublished: true, estimatedHours: 40, thumbnailUrl: null, instructorId: 'dev-user-id' };

    if (opName === 'CourseDetail') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { course: { ...courseA, modules: [] } } })
      });
    }
    if (opName === 'DeleteCourse' || queryStr.includes('deleteCourse')) {
      deleteWasCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { deleteCourse: true } })
      });
    }
    if (opName === 'Courses' || queryStr.includes('courses(')) {
      const courses = deleteWasCalled ? [courseB, courseC] : [courseA, courseB, courseC];
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { courses } })
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
  });

  // BEFORE: courses list with 3 courses
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOTS}/bug103-delete-before.png`, fullPage: false });
  console.log('BEFORE screenshot saved');

  // Navigate to course detail and delete
  await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const deleteBtn = await page.getByTestId('delete-course-btn');
  await deleteBtn.scrollIntoViewIfNeeded();
  await deleteBtn.click({ force: true });
  await page.waitForTimeout(500);
  
  await page.getByTestId('delete-course-confirm-input').fill('Introduction to Machine Learning');
  await page.waitForTimeout(300);
  await page.getByTestId('delete-course-confirm-btn').click({ force: true });
  
  await page.waitForURL(url => new URL(url).pathname === '/courses', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // AFTER: courses list with 2 courses (deleted one gone)
  await page.screenshot({ path: `${SCREENSHOTS}/bug103-delete-after.png`, fullPage: false });
  console.log('AFTER screenshot saved');

  await browser.close();
})();

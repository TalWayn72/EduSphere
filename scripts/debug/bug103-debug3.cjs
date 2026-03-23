const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5176';

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
  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  await devBtn.waitFor({ timeout: 10000 });
  await devBtn.click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  console.log('--- LOGIN DONE ---');

  // Set up mock
  await page.route('**/graphql', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization' }, body: '' });
      return;
    }
    let parsed = {};
    try { parsed = JSON.parse(req.postData() || '{}'); } catch {}
    const opName = parsed.operationName || '';
    const queryStr = String(parsed.query || '');
    console.log(`[MOCK] ${opName}`);

    if (opName === 'CourseDetail') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: { course: { __typename: 'Course', id: 'test-delete-1', title: 'Course To Be Deleted', description: 'test', thumbnailUrl: null, estimatedHours: 5, isPublished: false, instructorId: 'dev-user-id', modules: [] } } })
      });
      return;
    }
    if (opName === 'DeleteCourse' || queryStr.includes('deleteCourse')) {
      deleteWasCalled = true;
      console.log('  --> DELETE MUTATION CALLED');
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: { deleteCourse: true } })
      });
      return;
    }
    if (opName === 'Courses' || queryStr.includes('courses(')) {
      const courses = deleteWasCalled ? [] : [{ __typename: 'Course', id: 'test-delete-1', title: 'Course To Be Deleted', slug: 'test', description: 'test', isPublished: false, estimatedHours: 5, thumbnailUrl: null, instructorId: 'dev-user-id' }];
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: { courses } })
      });
      return;
    }
    
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: {} }) });
  });

  // Navigate to course detail
  await page.goto(`${BASE_URL}/courses/test-delete-1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  console.log('--- ON COURSE DETAIL ---');
  console.log('URL:', page.url());
  
  // Find delete button
  const deleteBtn = page.getByTestId('delete-course-btn');
  const exists = await deleteBtn.count();
  console.log('Delete button count:', exists);
  
  if (exists > 0) {
    await deleteBtn.click();
    console.log('--- CLICKED DELETE ---');
    await page.waitForTimeout(1000);
    
    // Fill confirm input
    const dialog = page.getByTestId('delete-course-dialog');
    const dialogVisible = await dialog.isVisible();
    console.log('Dialog visible:', dialogVisible);
    
    if (dialogVisible) {
      const confirmInput = page.getByTestId('delete-course-confirm-input');
      await confirmInput.fill('Course To Be Deleted');
      console.log('--- FILLED CONFIRM ---');
      await page.waitForTimeout(500);
      
      const confirmBtn = page.getByTestId('delete-course-confirm-btn');
      const btnEnabled = await confirmBtn.isEnabled();
      console.log('Confirm button enabled:', btnEnabled);
      
      if (btnEnabled) {
        await confirmBtn.click();
        console.log('--- CLICKED CONFIRM ---');
        await page.waitForTimeout(3000);
        console.log('URL after delete:', page.url());
      }
    }
  }
  
  await page.screenshot({ path: 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots/bug103-debug3.png' });
  console.log('deleteWasCalled:', deleteWasCalled);
  
  await browser.close();
})();

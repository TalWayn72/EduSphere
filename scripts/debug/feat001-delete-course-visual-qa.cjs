const { chromium } = require('C:/Users/P0039217/.claude/projects/EduSphere/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core');
const path = require('path');

const SCREENSHOTS_DIR = 'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';
const BASE_URL = 'http://localhost:5173';

async function login(page, email, password) {
  console.log(`\n=== Logging in as ${email} ===`);
  await page.goto(`${BASE_URL}/login`, { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click sign-in to go to Keycloak
  const signInBtn = await page.$('button:has-text("Sign In"), button:has-text("Login"), button:has-text("כניסה"), button:has-text("התחברות"), button[type="submit"]');
  if (signInBtn) {
    await signInBtn.click();
    await page.waitForTimeout(5000);
  }

  const url = page.url();
  if (url.includes('8080') || url.includes('keycloak') || url.includes('realms')) {
    console.log('On Keycloak login page');
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.fill('#username', email);
    await page.fill('#password', password);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => null),
      page.click('#kc-login'),
    ]);
    await page.waitForTimeout(3000);
    console.log('After login URL:', page.url());
  } else {
    console.log('Not on Keycloak — URL:', url);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // =============================================
  // TEST 1: Instructor sees Delete button
  // =============================================
  console.log('\n========================================');
  console.log('TEST 1: Instructor — Delete button visible');
  console.log('========================================');

  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page1 = await ctx1.newPage();

  await login(page1, 'instructor@example.com', 'Instructor123!');

  // Navigate to courses page
  console.log('\n=== Navigating to courses page ===');
  await page1.goto(`${BASE_URL}/courses`, { timeout: 15000 });
  await page1.waitForTimeout(3000);
  console.log('Courses page URL:', page1.url());

  // Find a course link — look for course cards or links
  const courseLinks = await page1.$$eval('a[href*="/courses/"]', els =>
    els.map(e => ({
      href: e.getAttribute('href'),
      text: (e.textContent || '').trim().substring(0, 80),
    })).filter(e => e.href && !e.href.includes('/new') && !e.href.includes('/edit') && e.href.match(/\/courses\/[a-zA-Z0-9-]+$/))
  );
  console.log('Found course links:', JSON.stringify(courseLinks.slice(0, 5), null, 2));

  let courseId = null;
  if (courseLinks.length > 0) {
    const firstCourseHref = courseLinks[0].href;
    courseId = firstCourseHref.split('/courses/')[1];
    console.log('Using course:', courseId, '—', courseLinks[0].text);

    // Go to edit page
    const editUrl = `${BASE_URL}/courses/${courseId}/edit`;
    console.log('Navigating to edit page:', editUrl);
    await page1.goto(editUrl, { timeout: 15000 });
    await page1.waitForTimeout(3000);
    console.log('Edit page URL:', page1.url());
  } else {
    // Try discovery page or look for any course-like navigation
    console.log('No course links found on /courses, trying /courses/discovery...');
    await page1.goto(`${BASE_URL}/courses/discovery`, { timeout: 15000 });
    await page1.waitForTimeout(3000);

    const discoveryLinks = await page1.$$eval('a[href*="/courses/"]', els =>
      els.map(e => ({
        href: e.getAttribute('href'),
        text: (e.textContent || '').trim().substring(0, 80),
      })).filter(e => e.href && !e.href.includes('/new') && !e.href.includes('/edit') && !e.href.includes('/discovery') && e.href.match(/\/courses\/[a-zA-Z0-9-]+/))
    );
    console.log('Discovery course links:', JSON.stringify(discoveryLinks.slice(0, 5), null, 2));

    if (discoveryLinks.length > 0) {
      const href = discoveryLinks[0].href;
      courseId = href.split('/courses/')[1]?.split('/')[0];
      const editUrl = `${BASE_URL}/courses/${courseId}/edit`;
      console.log('Navigating to edit page:', editUrl);
      await page1.goto(editUrl, { timeout: 15000 });
      await page1.waitForTimeout(3000);
    }
  }

  // Check for delete button
  const deleteBtn = await page1.$('[data-testid="delete-course-btn"]');
  if (deleteBtn) {
    console.log('✅ Delete Course button FOUND');
    const btnText = await deleteBtn.textContent();
    console.log('Button text:', btnText.trim());
  } else {
    console.log('❌ Delete Course button NOT FOUND');
    // Check all buttons on page
    const allBtns = await page1.$$eval('button', els =>
      els.map(e => ({
        text: (e.textContent || '').trim().substring(0, 60),
        testid: e.getAttribute('data-testid'),
        classes: e.className.substring(0, 80),
      }))
    );
    console.log('All buttons on page:', JSON.stringify(allBtns, null, 2));
  }

  await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feat001-delete-button-visible.png'), fullPage: false });
  console.log('Screenshot saved: feat001-delete-button-visible.png');

  // =============================================
  // TEST 2: Delete dialog
  // =============================================
  console.log('\n========================================');
  console.log('TEST 2: Delete dialog interaction');
  console.log('========================================');

  if (deleteBtn) {
    console.log('Clicking Delete Course button...');
    await deleteBtn.click();
    await page1.waitForTimeout(1500);

    const dialog = await page1.$('[data-testid="delete-course-dialog"]');
    if (dialog) {
      console.log('✅ Delete dialog OPENED');
    } else {
      console.log('⚠️  Dialog element not found by testid, checking for any dialog...');
      const anyDialog = await page1.$('[role="alertdialog"], [role="dialog"]');
      console.log('Dialog via role:', !!anyDialog);
    }

    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feat001-delete-dialog.png'), fullPage: false });
    console.log('Screenshot saved: feat001-delete-dialog.png');

    // Type wrong text
    const confirmInput = await page1.$('[data-testid="delete-course-confirm-input"]');
    if (confirmInput) {
      await confirmInput.fill('WRONG_TEXT');
      await page1.waitForTimeout(500);

      // Check if confirm button is disabled
      const confirmBtn = await page1.$('[data-testid="delete-course-confirm-btn"]');
      if (confirmBtn) {
        const isDisabled = await confirmBtn.isDisabled();
        console.log('Confirm button disabled with wrong text:', isDisabled ? '✅ YES (correct)' : '❌ NO (BUG!)');
      }

      await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feat001-delete-dialog-wrong-input.png'), fullPage: false });
      console.log('Screenshot saved: feat001-delete-dialog-wrong-input.png');
    }

    // Click Cancel
    const cancelBtn = await page1.$('[data-testid="delete-course-cancel-btn"]');
    if (cancelBtn) {
      await cancelBtn.click();
      await page1.waitForTimeout(1000);
      console.log('✅ Clicked Cancel — dialog should be closed');
    }
  } else {
    console.log('⚠️  Cannot test dialog — delete button not found');
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feat001-delete-dialog.png'), fullPage: false });
  }

  await ctx1.close();

  // =============================================
  // TEST 3: Student cannot see delete button
  // =============================================
  console.log('\n========================================');
  console.log('TEST 3: Student — NO delete button');
  console.log('========================================');

  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();

  await login(page2, 'student@example.com', 'Student123!');

  if (courseId) {
    // Student should see course detail page (not edit page)
    const detailUrl = `${BASE_URL}/courses/${courseId}`;
    console.log('Navigating to course detail:', detailUrl);
    await page2.goto(detailUrl, { timeout: 15000 });
    await page2.waitForTimeout(3000);
    console.log('Student course URL:', page2.url());

    const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
    if (studentDeleteBtn) {
      console.log('❌ BUG: Student can see Delete Course button!');
    } else {
      console.log('✅ Student CANNOT see Delete Course button (correct)');
    }

    // Also check if student can access edit page
    const editUrl = `${BASE_URL}/courses/${courseId}/edit`;
    console.log('Trying to access edit page as student:', editUrl);
    await page2.goto(editUrl, { timeout: 15000 });
    await page2.waitForTimeout(3000);
    console.log('After edit page navigation URL:', page2.url());

    const redirected = !page2.url().includes('/edit');
    console.log('Student redirected away from edit page:', redirected ? '✅ YES (correct)' : '⚠️  NO — check role guard');

    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feat001-student-view.png'), fullPage: false });
    console.log('Screenshot saved: feat001-student-view.png');
  } else {
    // No course found — go to courses page
    await page2.goto(`${BASE_URL}/courses`, { timeout: 15000 });
    await page2.waitForTimeout(3000);

    const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
    console.log('Student sees delete button on courses list:', studentDeleteBtn ? '❌ BUG' : '✅ No (correct)');

    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feat001-student-view.png'), fullPage: false });
    console.log('Screenshot saved: feat001-student-view.png');
  }

  await ctx2.close();
  await browser.close();

  console.log('\n========================================');
  console.log('VISUAL QA COMPLETE');
  console.log('========================================');
  console.log('Screenshots saved to docs/screenshots/:');
  console.log('  - feat001-delete-button-visible.png');
  console.log('  - feat001-delete-dialog.png');
  console.log('  - feat001-delete-dialog-wrong-input.png');
  console.log('  - feat001-student-view.png');
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

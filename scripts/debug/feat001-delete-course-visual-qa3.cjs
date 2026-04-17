const {
  chromium,
} = require('C:/Users/P0039217/.claude/projects/EduSphere/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core');
const path = require('path');

const SCREENSHOTS_DIR =
  'c:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';
const BASE_URL = 'http://localhost:5173';

async function login(page, email, password) {
  console.log(`\n=== Logging in as ${email} ===`);
  await page.goto(`${BASE_URL}/login`, { timeout: 15000 });
  await page.waitForTimeout(2000);

  const signInBtn = await page.$(
    'button:has-text("Sign In"), button:has-text("Login"), button:has-text("כניסה"), button:has-text("התחברות"), button[type="submit"]'
  );
  if (signInBtn) {
    await signInBtn.click();
    await page.waitForTimeout(5000);
  }

  const url = page.url();
  if (
    url.includes('8080') ||
    url.includes('keycloak') ||
    url.includes('realms')
  ) {
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.fill('#username', email);
    await page.fill('#password', password);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => null),
      page.click('#kc-login'),
    ]);
    await page.waitForTimeout(3000);
    console.log('Logged in, URL:', page.url());
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // =============================================
  // TEST 1: Instructor — navigate to edit page via Edit button
  // =============================================
  console.log('\n========================================');
  console.log('TEST 1: Instructor — Delete button on edit page');
  console.log('========================================');

  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page1 = await ctx1.newPage();
  await login(page1, 'instructor@example.com', 'Instructor123!');

  // Go to courses list
  await page1.goto(`${BASE_URL}/courses`, { timeout: 15000 });
  await page1.waitForTimeout(3000);

  // Get HTML structure around first Edit button to understand layout
  const firstEditInfo = await page1.$$eval('button', (els) => {
    const editBtns = els.filter((e) => e.textContent.trim() === 'Edit');
    if (editBtns.length === 0) return null;
    const btn = editBtns[0];
    // Find the parent card/row — look for nearest link
    let parent = btn.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!parent) break;
      const link = parent.querySelector('a[href*="/courses/"]');
      if (link)
        return {
          linkHref: link.getAttribute('href'),
          btnText: btn.textContent.trim(),
        };
      parent = parent.parentElement;
    }
    // Check onClick attribute or nearby links
    return {
      parentHTML: btn.parentElement?.innerHTML?.substring(0, 200),
      btnOnClick: btn.getAttribute('onclick'),
    };
  });
  console.log(
    'First Edit button context:',
    JSON.stringify(firstEditInfo, null, 2)
  );

  // Strategy: click the first "Edit" button and see where it navigates
  console.log('Clicking first Edit button...');
  const editButtons = await page1.$$('button:text-is("Edit")');
  console.log('Total Edit buttons found:', editButtons.length);

  if (editButtons.length > 0) {
    // Listen for navigation
    const navPromise = page1
      .waitForURL('**/edit**', { timeout: 10000 })
      .catch(() => null);
    await editButtons[0].click();
    await navPromise;
    await page1.waitForTimeout(2000);
    console.log('After clicking Edit, URL:', page1.url());

    if (page1.url().includes('/edit')) {
      console.log('✅ Successfully navigated to edit page');

      // Now look for delete button
      const deleteBtn = await page1.$('[data-testid="delete-course-btn"]');
      if (deleteBtn) {
        console.log('✅ Delete Course button FOUND');
        const btnText = await deleteBtn.textContent();
        console.log('Button text:', btnText.trim());

        // Check it's visually styled as destructive
        const btnClasses = await deleteBtn.getAttribute('class');
        const hasDestructive = btnClasses?.includes('destructive');
        console.log(
          'Has destructive styling:',
          hasDestructive ? '✅ YES' : '⚠️  NO'
        );
      } else {
        console.log('❌ Delete Course button NOT FOUND on edit page');
        const allBtns = await page1.$$eval('button', (els) =>
          els.map((e) => ({
            text: (e.textContent || '').trim().substring(0, 60),
            testid: e.getAttribute('data-testid'),
          }))
        );
        console.log('Buttons on edit page:', JSON.stringify(allBtns, null, 2));
      }

      await page1.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'feat001-delete-button-visible.png'),
        fullPage: false,
      });
      console.log('Screenshot saved: feat001-delete-button-visible.png');

      // =============================================
      // TEST 2: Delete dialog
      // =============================================
      console.log('\n========================================');
      console.log('TEST 2: Delete dialog');
      console.log('========================================');

      const deleteBtn2 = await page1.$('[data-testid="delete-course-btn"]');
      if (deleteBtn2) {
        await deleteBtn2.click();
        await page1.waitForTimeout(1500);

        // Check dialog opened
        const dialog = await page1.$(
          '[data-testid="delete-course-dialog"], [role="alertdialog"], [role="dialog"]'
        );
        console.log('Dialog opened:', dialog ? '✅ YES' : '❌ NO');

        await page1.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'feat001-delete-dialog.png'),
          fullPage: false,
        });
        console.log('Screenshot saved: feat001-delete-dialog.png');

        // Type wrong text
        const confirmInput = await page1.$(
          '[data-testid="delete-course-confirm-input"]'
        );
        if (confirmInput) {
          await confirmInput.fill('WRONG_TEXT');
          await page1.waitForTimeout(500);

          const confirmBtn = await page1.$(
            '[data-testid="delete-course-confirm-btn"]'
          );
          if (confirmBtn) {
            const isDisabled = await confirmBtn.isDisabled();
            console.log(
              'Confirm button disabled with wrong text:',
              isDisabled ? '✅ DISABLED (correct)' : '❌ ENABLED (BUG!)'
            );
            const ariaDisabled = await confirmBtn.getAttribute('aria-disabled');
            console.log('aria-disabled:', ariaDisabled);
          }

          await page1.screenshot({
            path: path.join(
              SCREENSHOTS_DIR,
              'feat001-delete-dialog-wrong-input.png'
            ),
            fullPage: false,
          });
          console.log(
            'Screenshot saved: feat001-delete-dialog-wrong-input.png'
          );
        }

        // Click Cancel
        const cancelBtn = await page1.$(
          '[data-testid="delete-course-cancel-btn"]'
        );
        if (cancelBtn) {
          await cancelBtn.click();
          await page1.waitForTimeout(1000);
          const dialogGone = !(await page1.$(
            '[data-testid="delete-course-dialog"]:visible'
          ));
          console.log('Dialog closed after Cancel:', '✅ YES');
        }
      }
    } else {
      console.log('⚠️  Did not navigate to edit page, URL:', page1.url());
      await page1.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'feat001-delete-button-visible.png'),
        fullPage: false,
      });
    }
  }

  // Get courseId for student test
  const courseUrl = page1.url();
  let courseId = null;
  const match = courseUrl.match(/\/courses\/([a-zA-Z0-9-]+)/);
  if (match) courseId = match[1];
  console.log('\nCourse ID for student test:', courseId);

  await ctx1.close();

  // =============================================
  // TEST 3: Student — no delete button
  // =============================================
  console.log('\n========================================');
  console.log('TEST 3: Student — NO delete button');
  console.log('========================================');

  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page2 = await ctx2.newPage();
  await login(page2, 'student@example.com', 'Student123!');

  if (courseId) {
    // Student visits course detail page
    await page2.goto(`${BASE_URL}/courses/${courseId}`, { timeout: 15000 });
    await page2.waitForTimeout(3000);
    console.log('Student course detail URL:', page2.url());

    const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
    console.log(
      'Delete button visible to student:',
      studentDeleteBtn ? '❌ BUG — visible!' : '✅ NOT visible (correct)'
    );

    const studentEditBtn = await page2.$('[data-testid="edit-course-btn"]');
    console.log(
      'Edit button visible to student:',
      studentEditBtn ? '⚠️  Visible' : '✅ NOT visible'
    );

    // Try direct access to edit page
    await page2.goto(`${BASE_URL}/courses/${courseId}/edit`, {
      timeout: 15000,
    });
    await page2.waitForTimeout(3000);
    console.log('Student on edit page URL:', page2.url());
    const redirected = !page2.url().includes('/edit');
    console.log(
      'Redirected away from edit:',
      redirected ? '✅ YES (role guard works)' : '❌ NO (BUG)'
    );

    if (!redirected) {
      const deleteBtnOnEdit = await page2.$(
        '[data-testid="delete-course-btn"]'
      );
      console.log(
        'Delete button on forced edit page:',
        deleteBtnOnEdit ? '❌ BUG' : '✅ Not present'
      );
    }
  } else {
    await page2.goto(`${BASE_URL}/courses`, { timeout: 15000 });
    await page2.waitForTimeout(3000);
    const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
    console.log(
      'Delete button visible to student:',
      studentDeleteBtn ? '❌ BUG' : '✅ NOT visible (correct)'
    );
  }

  await page2.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'feat001-student-view.png'),
    fullPage: false,
  });
  console.log('Screenshot saved: feat001-student-view.png');

  await ctx2.close();
  await browser.close();

  console.log('\n========================================');
  console.log('VISUAL QA SUMMARY');
  console.log('========================================');
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

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
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // =============================================
  // TEST 1: Instructor — find course & go to edit page
  // =============================================
  console.log('\n========================================');
  console.log('TEST 1: Instructor — Delete button on edit page');
  console.log('========================================');

  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page1 = await ctx1.newPage();
  await login(page1, 'instructor@example.com', 'Instructor123!');

  // Go to courses — the /courses route shows a single course detail
  // Look for Edit Course button and click it
  await page1.goto(`${BASE_URL}/courses`, { timeout: 15000 });
  await page1.waitForTimeout(3000);

  // Find the edit button to navigate to edit page
  const editBtn = await page1.$('[data-testid="edit-course-btn"]');
  if (editBtn) {
    console.log('Found Edit Course button, clicking...');
    await editBtn.click();
    await page1.waitForTimeout(3000);
    console.log('Edit page URL:', page1.url());
  } else {
    // Try to find any course link and navigate to edit
    console.log('No edit button found, trying to find course links...');
    // Dump all anchors to find courses
    const anchors = await page1.$$eval('a', (els) =>
      els
        .map((e) => ({
          href: e.getAttribute('href') || '',
          text: (e.textContent || '').trim().substring(0, 60),
        }))
        .filter((e) => e.href.includes('/courses'))
    );
    console.log(
      'Course-related anchors:',
      JSON.stringify(anchors.slice(0, 10), null, 2)
    );

    // Try navigating to the URL shown when clicking edit
    const currentUrl = page1.url();
    if (currentUrl.includes('/courses/')) {
      const courseId = currentUrl.split('/courses/')[1]?.split(/[/?#]/)[0];
      if (courseId && courseId !== 'new' && courseId !== 'discovery') {
        console.log('Extracted courseId from URL:', courseId);
        await page1.goto(`${BASE_URL}/courses/${courseId}/edit`, {
          timeout: 15000,
        });
        await page1.waitForTimeout(3000);
      }
    }
  }

  console.log('Current URL:', page1.url());

  // Now look for the delete button
  const deleteBtn = await page1.$('[data-testid="delete-course-btn"]');
  if (deleteBtn) {
    console.log('✅ Delete Course button FOUND on edit page');
    const btnText = await deleteBtn.textContent();
    console.log('Button text:', btnText.trim());

    // Get button style info
    const btnStyle = await deleteBtn.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        borderColor: styles.borderColor,
        visible: el.offsetParent !== null,
        rect: el.getBoundingClientRect(),
      };
    });
    console.log('Button visibility:', btnStyle.visible ? 'VISIBLE' : 'HIDDEN');
    console.log('Button position:', JSON.stringify(btnStyle.rect));
  } else {
    console.log('❌ Delete Course button NOT FOUND');
    // List all buttons
    const allBtns = await page1.$$eval('button', (els) =>
      els.map((e) => ({
        text: (e.textContent || '').trim().substring(0, 60),
        testid: e.getAttribute('data-testid'),
      }))
    );
    console.log('All buttons:', JSON.stringify(allBtns, null, 2));
  }

  await page1.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'feat001-delete-button-visible.png'),
    fullPage: false,
  });
  console.log('Screenshot saved: feat001-delete-button-visible.png');

  // =============================================
  // TEST 2: Delete dialog interaction
  // =============================================
  console.log('\n========================================');
  console.log('TEST 2: Delete dialog');
  console.log('========================================');

  if (deleteBtn) {
    await deleteBtn.click();
    await page1.waitForTimeout(1500);

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
      await confirmInput.fill('WRONG_TEXT_HERE');
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

        // Also check aria-disabled
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
      console.log('Screenshot saved: feat001-delete-dialog-wrong-input.png');

      // Now clear and check hint text
      await confirmInput.fill('');
      await page1.waitForTimeout(300);

      const hintEl = await page1.$('#delete-course-confirm-hint');
      if (hintEl) {
        const hintText = await hintEl.textContent();
        console.log('Hint text (empty input):', hintText.trim());
      }
    }

    // Click Cancel
    const cancelBtn = await page1.$('[data-testid="delete-course-cancel-btn"]');
    if (cancelBtn) {
      await cancelBtn.click();
      await page1.waitForTimeout(1000);

      const dialogAfterCancel = await page1.$(
        '[data-testid="delete-course-dialog"]'
      );
      const dialogVisible = dialogAfterCancel
        ? await dialogAfterCancel.isVisible()
        : false;
      console.log(
        'Dialog closed after Cancel:',
        !dialogVisible ? '✅ CLOSED' : '❌ STILL OPEN'
      );
    }
  } else {
    console.log('⚠️  Cannot test dialog — delete button not found');
  }

  // Save courseId for student test
  const courseUrl = page1.url();
  let courseId = null;
  if (courseUrl.includes('/courses/')) {
    courseId = courseUrl.split('/courses/')[1]?.split(/[/?#/]/)[0];
  }
  console.log('Course ID for student test:', courseId);

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
    // Student goes to course detail page
    console.log(
      'Navigating to course detail:',
      `${BASE_URL}/courses/${courseId}`
    );
    await page2.goto(`${BASE_URL}/courses/${courseId}`, { timeout: 15000 });
    await page2.waitForTimeout(3000);
    console.log('Student page URL:', page2.url());

    const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
    console.log(
      'Student sees delete button on detail page:',
      studentDeleteBtn ? '❌ BUG — visible!' : '✅ NOT visible (correct)'
    );

    // Also check if student sees edit button (they shouldn't)
    const studentEditBtn = await page2.$('[data-testid="edit-course-btn"]');
    console.log(
      'Student sees edit button:',
      studentEditBtn ? '⚠️  Visible' : '✅ NOT visible'
    );

    // Try accessing edit page directly
    console.log('Trying edit page directly as student...');
    await page2.goto(`${BASE_URL}/courses/${courseId}/edit`, {
      timeout: 15000,
    });
    await page2.waitForTimeout(3000);
    console.log('After edit attempt URL:', page2.url());

    const redirectedAway = !page2.url().includes('/edit');
    console.log(
      'Student redirected from edit page:',
      redirectedAway
        ? '✅ YES (correct — role guard works)'
        : '❌ NO (BUG — guard missing)'
    );

    // Check if delete button exists even if student somehow got to edit page
    const deleteBtnOnEdit = await page2.$('[data-testid="delete-course-btn"]');
    console.log(
      'Delete button on student edit attempt:',
      deleteBtnOnEdit ? '❌ BUG' : '✅ Not present'
    );
  } else {
    // Just check courses page
    await page2.goto(`${BASE_URL}/courses`, { timeout: 15000 });
    await page2.waitForTimeout(3000);

    const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
    console.log(
      'Student sees delete button:',
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
  console.log('VISUAL QA COMPLETE');
  console.log('========================================');
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

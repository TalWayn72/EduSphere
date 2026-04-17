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
    'button:has-text("Sign In"), button:has-text("כניסה"), button[type="submit"]'
  );
  if (signInBtn) {
    await signInBtn.click();
    await page.waitForTimeout(5000);
  }
  if (page.url().includes('8080') || page.url().includes('keycloak')) {
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.fill('#username', email);
    await page.fill('#password', password);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => null),
      page.click('#kc-login'),
    ]);
    await page.waitForTimeout(3000);
  }
  console.log('Logged in, URL:', page.url());
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // =============================================
  // TEST 1: Instructor — find a course and go to edit page
  // =============================================
  console.log('\n========================================');
  console.log('TEST 1: Instructor — Delete button on edit page');
  console.log('========================================');

  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page1 = await ctx1.newPage();
  await login(page1, 'instructor@example.com', 'Instructor123!');

  // Go to courses page
  await page1.goto(`${BASE_URL}/courses`, {
    timeout: 15000,
    waitUntil: 'networkidle',
  });
  await page1.waitForTimeout(3000);
  console.log('Courses page URL:', page1.url());

  // Dump all links and buttons
  const pageInfo = await page1.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
      .map((a) => ({
        href: a.getAttribute('href'),
        text: (a.textContent || '').trim().substring(0, 60),
      }))
      .filter((a) => a.href && a.href.includes('/courses'));

    const buttons = Array.from(document.querySelectorAll('button')).map(
      (b) => ({
        text: (b.textContent || '').trim().substring(0, 60),
        testid: b.getAttribute('data-testid'),
      })
    );

    return {
      links,
      buttons,
      bodyText: document.body.textContent.substring(0, 500),
    };
  });
  console.log('Course links:', JSON.stringify(pageInfo.links, null, 2));
  console.log(
    'Buttons:',
    JSON.stringify(pageInfo.buttons.slice(0, 15), null, 2)
  );
  console.log(
    'Page text (first 300):',
    pageInfo.bodyText.replace(/\s+/g, ' ').substring(0, 300)
  );

  await page1.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'feat001-courses-page.png'),
    fullPage: false,
  });

  // Try to find a courseId - look for /courses/<uuid> pattern in links
  let courseId = null;
  for (const link of pageInfo.links) {
    const m = link.href.match(/\/courses\/([a-f0-9-]{36})/);
    if (m) {
      courseId = m[1];
      break;
    }
  }

  // If no UUID link, check if the page has course cards with data attributes
  if (!courseId) {
    const cardInfo = await page1.evaluate(() => {
      const cards = document.querySelectorAll(
        '[data-course-id], [data-testid*="course"]'
      );
      return Array.from(cards).map((c) => ({
        testid: c.getAttribute('data-testid'),
        courseId: c.getAttribute('data-course-id'),
        text: (c.textContent || '').trim().substring(0, 60),
      }));
    });
    console.log('Course cards:', JSON.stringify(cardInfo, null, 2));
    if (cardInfo.length > 0 && cardInfo[0].courseId) {
      courseId = cardInfo[0].courseId;
    }
  }

  // If still no courseId, try clicking on a course card/link
  if (!courseId) {
    // Try clicking first course-related link
    const courseLink = await page1.$('a[href*="/courses/"][href*="-"]');
    if (courseLink) {
      const href = await courseLink.getAttribute('href');
      console.log('Clicking course link:', href);
      await courseLink.click();
      await page1.waitForTimeout(3000);
      console.log('After click URL:', page1.url());
      const m = page1.url().match(/\/courses\/([a-f0-9-]{36})/);
      if (m) courseId = m[1];
    }
  }

  // If still no courseId, hardcode the one we found earlier
  if (!courseId) {
    courseId = '9df04908-3ac9-4349-834c-46fd03add80d';
    console.log('Using hardcoded courseId:', courseId);
  }

  // Navigate to edit page
  const editUrl = `${BASE_URL}/courses/${courseId}/edit`;
  console.log('Navigating to edit page:', editUrl);
  await page1.goto(editUrl, { timeout: 15000, waitUntil: 'networkidle' });
  await page1.waitForTimeout(4000);
  console.log('Edit page URL:', page1.url());

  // Check for delete button
  const deleteBtn = await page1.$('[data-testid="delete-course-btn"]');
  if (deleteBtn) {
    console.log('✅ Delete Course button FOUND');
    const btnText = await deleteBtn.textContent();
    console.log('Button text:', btnText.trim());
    const btnClasses = await deleteBtn.getAttribute('class');
    console.log(
      'Has destructive styling:',
      btnClasses.includes('destructive') ? '✅' : '❌'
    );
  } else {
    console.log('❌ Delete Course button NOT FOUND');
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
  console.log('Screenshot: feat001-delete-button-visible.png');

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

    const dialog = await page1.$(
      '[role="alertdialog"], [role="dialog"], [data-testid="delete-course-dialog"]'
    );
    console.log('Dialog opened:', dialog ? '✅ YES' : '❌ NO');

    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'feat001-delete-dialog.png'),
      fullPage: false,
    });
    console.log('Screenshot: feat001-delete-dialog.png');

    // Type wrong text and verify button disabled
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
          'Confirm disabled with wrong text:',
          isDisabled ? '✅ DISABLED' : '❌ ENABLED (BUG!)'
        );
      }

      await page1.screenshot({
        path: path.join(
          SCREENSHOTS_DIR,
          'feat001-delete-dialog-wrong-input.png'
        ),
        fullPage: false,
      });
      console.log('Screenshot: feat001-delete-dialog-wrong-input.png');
    }

    // Click Cancel
    const cancelBtn = await page1.$('[data-testid="delete-course-cancel-btn"]');
    if (cancelBtn) {
      await cancelBtn.click();
      await page1.waitForTimeout(1000);
      console.log('✅ Cancel clicked — dialog closed');
    }
  } else {
    console.log('⚠️ Cannot test dialog — delete button not found');
    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'feat001-delete-dialog.png'),
      fullPage: false,
    });
  }

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

  // Course detail page
  await page2.goto(`${BASE_URL}/courses/${courseId}`, {
    timeout: 15000,
    waitUntil: 'networkidle',
  });
  await page2.waitForTimeout(3000);
  console.log('Student course URL:', page2.url());

  const studentDeleteBtn = await page2.$('[data-testid="delete-course-btn"]');
  console.log(
    'Delete visible to student:',
    studentDeleteBtn ? '❌ BUG!' : '✅ NOT visible (correct)'
  );

  // Try edit page directly
  await page2.goto(`${BASE_URL}/courses/${courseId}/edit`, { timeout: 15000 });
  await page2.waitForTimeout(3000);
  console.log('Student edit attempt URL:', page2.url());
  const redirected = !page2.url().includes('/edit');
  console.log(
    'Redirected from edit:',
    redirected ? '✅ YES' : '❌ NO (guard missing)'
  );

  await page2.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'feat001-student-view.png'),
    fullPage: false,
  });
  console.log('Screenshot: feat001-student-view.png');

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

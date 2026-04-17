// Visual QA: Delete Course feature — instructor + student views
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS = path.resolve(__dirname, '../../docs/screenshots');
const BASE = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page, email, password, label) {
  console.log(`[${label}] Navigating to ${BASE}...`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);

  // Click login/sign-in link
  const loginLink = await page.$(
    'a[href*="login"], a:has-text("Sign In"), a:has-text("כניסה"), a:has-text("Login")'
  );
  if (loginLink) {
    console.log(`[${label}] Clicking login link...`);
    await loginLink.click();
    await sleep(2000);
  }

  console.log(`[${label}] URL after login click: ${page.url()}`);

  // Now click "Sign In with Keycloak" button
  const kcBtn = await page.$(
    'button:has-text("Sign In with Keycloak"), button:has-text("Keycloak"), button:has-text("כניסה")'
  );
  if (kcBtn) {
    console.log(`[${label}] Clicking Keycloak button...`);
    await kcBtn.click();
    await sleep(3000);
  }

  console.log(`[${label}] URL after KC button: ${page.url()}`);

  // Now we should be on Keycloak login page
  if (page.url().includes('keycloak') || page.url().includes(':8080')) {
    console.log(`[${label}] On Keycloak page, filling credentials...`);
    await page.fill('#username', email);
    await page.fill('#password', password);
    await page.click('#kc-login');
    await sleep(4000);
    console.log(`[${label}] After KC login URL: ${page.url()}`);
  } else {
    // Maybe direct form
    const usernameInput = await page.$(
      '#username, input[name="username"], input[name="email"]'
    );
    if (usernameInput) {
      await usernameInput.fill(email);
      const passInput = await page.$('#password, input[name="password"]');
      if (passInput) await passInput.fill(password);
      const submitBtn = await page.$('#kc-login, button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      await sleep(4000);
    }
  }

  console.log(`[${label}] Final URL: ${page.url()}`);
}

async function logout(page, label) {
  console.log(`[${label}] Logging out...`);
  // Try settings/profile menu
  const avatar = await page.$(
    '[data-testid="user-menu"], [data-testid="avatar"], button:has-text("Logout"), button:has-text("Sign Out"), button:has-text("יציאה")'
  );
  if (avatar) {
    await avatar.click();
    await sleep(500);
    const logoutItem = await page.$(
      'button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), button:has-text("יציאה"), a:has-text("יציאה")'
    );
    if (logoutItem) {
      await logoutItem.click();
      await sleep(2000);
    }
  }
  // Force clear by going to base
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ===== PART 1: Instructor Flow =====
  console.log('\n=== PART 1: Instructor Delete Course Flow ===\n');
  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx1.newPage();

  try {
    await login(page, 'instructor@example.com', 'Instructor123!', 'INSTRUCTOR');

    // Navigate to courses page
    console.log('[INSTRUCTOR] Navigating to courses...');
    await page.goto(`${BASE}/courses`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await sleep(3000);
    console.log(`[INSTRUCTOR] Courses page URL: ${page.url()}`);

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'feat001-courses-list.png'),
      fullPage: false,
    });

    // Find course links
    const allLinks = await page.$$eval('a[href]', (links) =>
      links.map((l) => ({
        href: l.href,
        text: l.textContent?.trim()?.substring(0, 60),
      }))
    );
    const courseDetailLinks = allLinks.filter((l) => {
      const m = l.href.match(/\/courses\/([^/]+)$/);
      return m && m[1] !== 'new' && m[1] !== 'discovery';
    });
    console.log(
      `[INSTRUCTOR] Course detail links: ${courseDetailLinks.length}`
    );
    courseDetailLinks
      .slice(0, 5)
      .forEach((l) => console.log(`  - ${l.text} → ${l.href}`));

    let foundEditPage = false;

    if (courseDetailLinks.length > 0) {
      // Go to first course detail
      const firstCourse = courseDetailLinks[0];
      console.log(`[INSTRUCTOR] Going to course: ${firstCourse.href}`);
      await page.goto(firstCourse.href, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await sleep(2000);
      console.log(`[INSTRUCTOR] Course detail URL: ${page.url()}`);

      await page.screenshot({
        path: path.join(SCREENSHOTS, 'feat001-course-detail.png'),
        fullPage: false,
      });

      // Look for edit link/button
      const editLink = await page.$(
        'a[href*="edit"], button:has-text("Edit"), button:has-text("עריכה")'
      );
      if (editLink) {
        console.log('[INSTRUCTOR] Found edit button, clicking...');
        await editLink.click();
        await sleep(2000);
        foundEditPage = true;
      } else {
        // Try appending /edit to URL
        const editUrl = firstCourse.href + '/edit';
        console.log(
          `[INSTRUCTOR] No edit button, trying direct URL: ${editUrl}`
        );
        await page.goto(editUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await sleep(2000);
        foundEditPage = true;
      }
    } else {
      // Check if we're on login page still
      console.log(
        '[INSTRUCTOR] No course links found. Checking page content...'
      );
      const bodyText = await page.$eval('body', (b) =>
        b.textContent?.substring(0, 500)
      );
      console.log(
        '[INSTRUCTOR] Page content preview:',
        bodyText?.substring(0, 300)
      );

      // Try /courses/discovery
      await page.goto(`${BASE}/courses/discovery`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await sleep(2000);
      console.log(`[INSTRUCTOR] Discovery page URL: ${page.url()}`);

      const links2 = await page.$$eval('a[href]', (links) =>
        links.map((l) => ({
          href: l.href,
          text: l.textContent?.trim()?.substring(0, 60),
        }))
      );
      const courseLinks2 = links2.filter((l) => {
        const m = l.href.match(/\/courses\/([^/]+)$/);
        return m && m[1] !== 'new' && m[1] !== 'discovery';
      });
      console.log(
        `[INSTRUCTOR] Discovery course links: ${courseLinks2.length}`
      );

      if (courseLinks2.length > 0) {
        await page.goto(courseLinks2[0].href + '/edit', {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await sleep(2000);
        foundEditPage = true;
      }
    }

    console.log(`[INSTRUCTOR] Edit page URL: ${page.url()}`);

    // Now look for Delete button
    const deleteBtn = await page.$(
      'button:has-text("Delete"), button:has-text("מחיקה"), button:has-text("Delete Course"), button:has-text("מחק קורס"), [data-testid*="delete"]'
    );

    if (deleteBtn) {
      console.log('[INSTRUCTOR] ✅ DELETE BUTTON FOUND!');
      const btnText = await deleteBtn.textContent();
      console.log(`[INSTRUCTOR] Button text: "${btnText}"`);
      await page.screenshot({
        path: path.join(SCREENSHOTS, 'feat001-edit-page-with-delete.png'),
        fullPage: false,
      });

      // Click delete button
      await deleteBtn.click();
      await sleep(1500);

      // Screenshot the confirmation dialog
      await page.screenshot({
        path: path.join(SCREENSHOTS, 'feat001-delete-dialog.png'),
        fullPage: false,
      });
      console.log('[INSTRUCTOR] Screenshot: delete confirmation dialog saved');

      // Check dialog content
      const dialogText = await page
        .$eval(
          '[role="dialog"], [role="alertdialog"], [data-testid*="dialog"], .modal, [class*="Dialog"]',
          (el) => el.textContent?.substring(0, 300)
        )
        .catch(() => 'no dialog element found');
      console.log(`[INSTRUCTOR] Dialog content: ${dialogText}`);

      // Dismiss dialog
      const cancelBtn = await page.$(
        'button:has-text("Cancel"), button:has-text("ביטול")'
      );
      if (cancelBtn) {
        await cancelBtn.click();
        await sleep(500);
      } else {
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    } else {
      console.log('[INSTRUCTOR] ❌ NO DELETE BUTTON FOUND');

      // Report all buttons
      const buttons = await page.$$eval('button', (btns) =>
        btns
          .map((b) => ({
            text: b.textContent?.trim()?.substring(0, 60),
            testId: b.getAttribute('data-testid'),
            visible: b.offsetParent !== null,
          }))
          .filter((b) => b.text && b.visible)
      );
      console.log(
        '[INSTRUCTOR] Visible buttons:',
        JSON.stringify(buttons, null, 2)
      );

      await page.screenshot({
        path: path.join(SCREENSHOTS, 'feat001-edit-page-no-delete.png'),
        fullPage: false,
      });
      console.log('[INSTRUCTOR] Screenshot: edit page saved');
    }
  } catch (err) {
    console.error('[INSTRUCTOR] Error:', err.message);
    await page
      .screenshot({
        path: path.join(SCREENSHOTS, 'feat001-instructor-error.png'),
        fullPage: false,
      })
      .catch(() => {});
  }

  await ctx1.close();

  // ===== PART 2: Student Flow =====
  console.log('\n=== PART 2: Student View (no delete) ===\n');
  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page2 = await ctx2.newPage();

  try {
    await login(page2, 'student@example.com', 'Student123!', 'STUDENT');

    // Navigate to courses
    await page2.goto(`${BASE}/courses`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await sleep(3000);
    console.log(`[STUDENT] Courses URL: ${page2.url()}`);

    // Find a course
    const studentLinks = await page2.$$eval('a[href]', (links) =>
      links.map((l) => ({
        href: l.href,
        text: l.textContent?.trim()?.substring(0, 60),
      }))
    );
    const studentCourseLinks = studentLinks.filter((l) => {
      const m = l.href.match(/\/courses\/([^/]+)$/);
      return m && m[1] !== 'new' && m[1] !== 'discovery';
    });
    console.log(`[STUDENT] Course links: ${studentCourseLinks.length}`);

    if (studentCourseLinks.length > 0) {
      await page2.goto(studentCourseLinks[0].href, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await sleep(2000);
      console.log(`[STUDENT] Course detail URL: ${page2.url()}`);
    } else {
      // Try discovery
      await page2.goto(`${BASE}/courses/discovery`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await sleep(2000);
      const dLinks = await page2.$$eval('a[href]', (links) =>
        links.map((l) => l.href)
      );
      const dCourseLinks = dLinks.filter((l) => {
        const m = l.match(/\/courses\/([^/]+)$/);
        return m && m[1] !== 'new' && m[1] !== 'discovery';
      });
      if (dCourseLinks.length > 0) {
        await page2.goto(dCourseLinks[0], {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await sleep(2000);
      }
    }

    // Check for delete/edit buttons (should NOT exist for student)
    const deleteBtn2 = await page2.$(
      'button:has-text("Delete"), button:has-text("מחיקה"), button:has-text("Delete Course"), [data-testid*="delete"]'
    );
    const editBtn2 = await page2.$(
      'a[href*="edit"], button:has-text("Edit"), button:has-text("עריכה"), [data-testid*="edit"]'
    );

    if (deleteBtn2) {
      console.log(
        '[STUDENT] ⚠️ WARNING: Delete button visible to student! SECURITY ISSUE!'
      );
    } else {
      console.log('[STUDENT] ✅ No delete button visible — correct behavior');
    }

    if (editBtn2) {
      console.log('[STUDENT] ⚠️ WARNING: Edit button visible to student');
    } else {
      console.log('[STUDENT] ✅ No edit button visible — correct behavior');
    }

    await page2.screenshot({
      path: path.join(SCREENSHOTS, 'feat001-student-no-delete.png'),
      fullPage: false,
    });
    console.log('[STUDENT] Screenshot saved');
  } catch (err) {
    console.error('[STUDENT] Error:', err.message);
    await page2
      .screenshot({
        path: path.join(SCREENSHOTS, 'feat001-student-error.png'),
        fullPage: false,
      })
      .catch(() => {});
  }

  await ctx2.close();
  await browser.close();
  console.log('\n=== Visual QA Complete ===');
})();

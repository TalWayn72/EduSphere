// Visual QA v3: Debug link structure, find courses properly
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS = path.resolve(__dirname, '../../docs/screenshots');
const BASE = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page, email, password, label) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);
  const loginLink = await page.$(
    'a[href*="login"], a:has-text("Sign In"), a:has-text("כניסה")'
  );
  if (loginLink) await loginLink.click();
  await sleep(2000);
  const kcBtn = await page.$(
    'button:has-text("Sign In with Keycloak"), button:has-text("Keycloak")'
  );
  if (kcBtn) await kcBtn.click();
  await sleep(3000);
  if (page.url().includes('keycloak') || page.url().includes(':8080')) {
    await page.fill('#username', email);
    await page.fill('#password', password);
    await page.click('#kc-login');
    await sleep(4000);
  }
  console.log(`[${label}] Logged in, URL: ${page.url()}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  await login(page, 'instructor@example.com', 'Instructor123!', 'INSTRUCTOR');

  // Step 1: Check /courses page
  console.log('\n--- /courses page ---');
  await page.goto(`${BASE}/courses`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await sleep(3000);
  let allLinks = await page.$$eval('a[href]', (links) =>
    links.map((l) => ({
      href: l.href,
      text: l.textContent?.trim()?.substring(0, 80),
    }))
  );
  console.log(
    'Links on /courses:',
    JSON.stringify(
      allLinks.filter((l) => !l.href.includes('#')),
      null,
      2
    )
  );

  // Step 2: Check /courses/discovery
  console.log('\n--- /courses/discovery page ---');
  await page.goto(`${BASE}/courses/discovery`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await sleep(3000);
  allLinks = await page.$$eval('a[href]', (links) =>
    links.map((l) => ({
      href: l.href,
      text: l.textContent?.trim()?.substring(0, 80),
    }))
  );
  const nonHash = allLinks.filter(
    (l) =>
      !l.href.includes('#') &&
      !l.href.endsWith('/courses/discovery') &&
      !l.href.endsWith('/courses')
  );
  console.log(
    'Non-trivial links on /discovery:',
    JSON.stringify(nonHash, null, 2)
  );

  // Click on one of the course cards (use any clickable element)
  const courseCards = await page.$$('[class*="card" i], [class*="Card"]');
  console.log(`\nCourse-like card elements: ${courseCards.length}`);

  // Try to find course cards by other means
  const cardContent = await page.$$eval(
    '[class*="card" i], [class*="Card"]',
    (cards) =>
      cards.slice(0, 5).map((c) => ({
        tag: c.tagName,
        classes: c.className?.substring(0, 100),
        text: c.textContent?.trim()?.substring(0, 100),
        childLinks: Array.from(c.querySelectorAll('a')).map((a) => a.href),
      }))
  );
  console.log('Card elements:', JSON.stringify(cardContent, null, 2));

  // Check for any links with /courses/ in the href
  const coursePathLinks = await page.$$eval('a', (links) =>
    links
      .map((l) => ({
        href: l.href,
        text: l.textContent?.trim()?.substring(0, 80),
      }))
      .filter((l) => l.href.includes('/courses/') && !l.href.includes('#'))
  );
  console.log(
    '\nAll /courses/ links:',
    JSON.stringify(coursePathLinks, null, 2)
  );

  // Step 3: Try clicking a course card directly
  if (coursePathLinks.length > 0) {
    // Filter to ones that look like detail pages
    const detailLinks = coursePathLinks.filter(
      (l) =>
        !l.href.endsWith('/discovery') &&
        !l.href.endsWith('/new') &&
        !l.href.endsWith('/courses/')
    );
    console.log('\nDetail-ish links:', JSON.stringify(detailLinks, null, 2));

    if (detailLinks.length > 0) {
      console.log(`\nNavigating to: ${detailLinks[0].href}`);
      await page.goto(detailLinks[0].href, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await sleep(3000);
      console.log(`Current URL: ${page.url()}`);

      // Check for edit and delete buttons
      const allBtns = await page.$$eval('button, a[role="button"]', (btns) =>
        btns
          .map((b) => ({
            text: b.textContent?.trim()?.substring(0, 60),
            testId: b.getAttribute('data-testid'),
            tag: b.tagName,
            visible: b.offsetParent !== null,
          }))
          .filter((b) => b.visible && b.text)
      );
      console.log(
        '\nAll visible buttons on course page:',
        JSON.stringify(allBtns, null, 2)
      );

      await page.screenshot({
        path: path.join(SCREENSHOTS, 'feat001-course-detail.png'),
      });

      // Now try clicking Edit Course button
      const editBtn = await page.$('[data-testid="edit-course-btn"]');
      if (editBtn) {
        console.log('\nClicking Edit Course button...');
        await editBtn.click();
        await sleep(3000);
        console.log(`After Edit click URL: ${page.url()}`);

        await page.screenshot({
          path: path.join(SCREENSHOTS, 'feat001-edit-page.png'),
        });

        // Check for delete button on edit page
        const allBtnsEdit = await page.$$eval('button', (btns) =>
          btns
            .map((b) => ({
              text: b.textContent?.trim()?.substring(0, 80),
              testId: b.getAttribute('data-testid'),
              visible: b.offsetParent !== null,
              classes: b.className?.substring(0, 100),
            }))
            .filter((b) => b.visible && b.text)
        );
        console.log('\nAll visible buttons on EDIT page:');
        allBtnsEdit.forEach((b) => {
          const isDeleteLike =
            /delete|מחיקה|remove|trash|הסר/i.test(b.text) ||
            /delete/i.test(b.testId || '');
          console.log(
            `  ${isDeleteLike ? '🗑️' : '  '} [${b.testId || '-'}] "${b.text}"`
          );
        });

        // Search for any delete-related element (not just buttons)
        const deleteElements = await page.$$eval(
          '[data-testid*="delete" i], [class*="delete" i], [aria-label*="delete" i]',
          (els) =>
            els.map((e) => ({
              tag: e.tagName,
              text: e.textContent?.trim()?.substring(0, 60),
              testId: e.getAttribute('data-testid'),
              visible: e.offsetParent !== null,
            }))
        );
        console.log(
          '\nDelete-related elements:',
          JSON.stringify(deleteElements, null, 2)
        );
      }
    }
  }

  // Step 4: Student flow
  console.log('\n\n=== STUDENT FLOW ===');
  await ctx.close();
  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page2 = await ctx2.newPage();

  await login(page2, 'student@example.com', 'Student123!', 'STUDENT');

  await page2.goto(`${BASE}/courses/discovery`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await sleep(3000);

  const studentCourseLinks = await page2.$$eval('a', (links) =>
    links
      .map((l) => ({
        href: l.href,
        text: l.textContent?.trim()?.substring(0, 80),
      }))
      .filter(
        (l) =>
          l.href.includes('/courses/') &&
          !l.href.includes('#') &&
          !l.href.endsWith('/discovery') &&
          !l.href.endsWith('/new')
      )
  );

  if (studentCourseLinks.length > 0) {
    await page2.goto(studentCourseLinks[0].href, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await sleep(2000);
    console.log(`Student on: ${page2.url()}`);

    const studentBtns = await page2.$$eval('button', (btns) =>
      btns
        .map((b) => ({
          text: b.textContent?.trim()?.substring(0, 60),
          testId: b.getAttribute('data-testid'),
          visible: b.offsetParent !== null,
        }))
        .filter(
          (b) =>
            b.visible &&
            b.text &&
            (/delete|edit|fork|enroll|מחיקה|עריכה/i.test(b.text) ||
              /delete|edit|fork|enroll/i.test(b.testId || ''))
        )
    );
    console.log(
      'Student action buttons:',
      JSON.stringify(studentBtns, null, 2)
    );
  }

  await page2.screenshot({
    path: path.join(SCREENSHOTS, 'feat001-student-no-delete.png'),
  });

  await ctx2.close();
  await browser.close();
  console.log('\n=== Visual QA v3 Complete ===');
})();

// Visual QA v2: Navigate to actual course edit page and check for delete
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS = path.resolve(__dirname, '../../docs/screenshots');
const BASE = 'http://localhost:5173';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(page, email, password, label) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);
  const loginLink = await page.$('a[href*="login"], a:has-text("Sign In"), a:has-text("כניסה")');
  if (loginLink) await loginLink.click();
  await sleep(2000);
  const kcBtn = await page.$('button:has-text("Sign In with Keycloak"), button:has-text("Keycloak")');
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

  // ===== INSTRUCTOR FLOW =====
  console.log('\n=== INSTRUCTOR: Find and test Delete Course ===\n');
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx1.newPage();

  await login(page, 'instructor@example.com', 'Instructor123!', 'INSTRUCTOR');

  // Go to discovery page where we know courses exist
  await page.goto(`${BASE}/courses/discovery`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  // Get course links (the ones with UUIDs)
  const courseHrefs = await page.$$eval('a[href]', links => {
    return links.map(l => l.href).filter(h => {
      const m = h.match(/\/courses\/([a-f0-9-]{36})$/i);
      return m !== null;
    });
  });
  console.log(`Found ${courseHrefs.length} course links with UUIDs`);
  courseHrefs.forEach(h => console.log(`  ${h}`));

  if (courseHrefs.length === 0) {
    // Maybe try /courses directly and look at all links
    await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);
    const allHrefs = await page.$$eval('a[href]', links => links.map(l => ({ href: l.href, text: l.textContent?.trim()?.substring(0, 50) })));
    console.log('All links on /courses:', JSON.stringify(allHrefs.filter(l => l.href.includes('course')), null, 2));
  }

  if (courseHrefs.length > 0) {
    const courseUrl = courseHrefs[0];
    const courseId = courseUrl.match(/\/courses\/([a-f0-9-]{36})$/i)[1];

    // Step 1: Go to course detail page
    console.log(`\nNavigating to course detail: ${courseUrl}`);
    await page.goto(courseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-course-detail.png') });

    // Step 2: Click the Edit Course button
    const editBtn = await page.$('[data-testid="edit-course-btn"], button:has-text("Edit Course"), a:has-text("Edit Course")');
    if (editBtn) {
      console.log('Found Edit Course button, clicking...');
      await editBtn.click();
      await sleep(3000);
      console.log(`After clicking Edit: ${page.url()}`);
    } else {
      // Try direct edit URL
      const editUrl = `${BASE}/courses/${courseId}/edit`;
      console.log(`No Edit button found, trying: ${editUrl}`);
      await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(3000);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page.png') });
    console.log(`Edit page URL: ${page.url()}`);

    // Step 3: Look for Delete button on the edit page
    const deleteBtn = await page.$('button:has-text("Delete"), button:has-text("מחיקה"), button:has-text("Delete Course"), button:has-text("מחק"), [data-testid*="delete"]');

    if (deleteBtn) {
      const btnText = await deleteBtn.textContent();
      console.log(`\n✅ DELETE BUTTON FOUND! Text: "${btnText.trim()}"`);
      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page-with-delete.png') });

      // Click delete
      await deleteBtn.click();
      await sleep(1500);

      // Check for dialog
      const dialog = await page.$('[role="dialog"], [role="alertdialog"], [data-state="open"]');
      if (dialog) {
        const dialogContent = await dialog.textContent();
        console.log(`Dialog content: ${dialogContent?.substring(0, 200)}`);
      }

      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-delete-dialog.png') });
      console.log('Screenshot: delete dialog saved');

      // Cancel
      const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("ביטול")');
      if (cancelBtn) await cancelBtn.click();
      else await page.keyboard.press('Escape');
      await sleep(500);

    } else {
      console.log('\n❌ NO DELETE BUTTON on edit page');

      // List all buttons on the edit page
      const buttons = await page.$$eval('button', btns =>
        btns.map(b => ({
          text: b.textContent?.trim()?.substring(0, 80),
          testId: b.getAttribute('data-testid'),
          visible: b.offsetParent !== null,
          disabled: b.disabled
        })).filter(b => b.text && b.visible)
      );
      console.log('\nVisible buttons on edit page:');
      buttons.forEach(b => console.log(`  [${b.testId || 'no-testid'}] "${b.text}" ${b.disabled ? '(disabled)' : ''}`));

      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page-no-delete.png') });
    }

    // Also check the course detail page for delete
    console.log('\n--- Checking course detail page for delete ---');
    await page.goto(courseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2000);
    const deleteOnDetail = await page.$('button:has-text("Delete"), button:has-text("מחיקה"), [data-testid*="delete"]');
    if (deleteOnDetail) {
      console.log('✅ Delete button found on DETAIL page');
    } else {
      console.log('❌ No delete button on detail page either');
      // Check header area specifically
      const headerBtns = await page.$$eval('[class*="header"], [class*="Header"], header', headers => {
        const btns = [];
        headers.forEach(h => {
          h.querySelectorAll('button, a').forEach(el => {
            const t = el.textContent?.trim()?.substring(0, 60);
            if (t) btns.push({ text: t, tag: el.tagName, testId: el.getAttribute('data-testid') });
          });
        });
        return btns;
      });
      console.log('Header buttons/links:', JSON.stringify(headerBtns, null, 2));
    }
  }

  await ctx1.close();

  // ===== STUDENT FLOW =====
  console.log('\n=== STUDENT: Verify no Delete button ===\n');
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();

  await login(page2, 'student@example.com', 'Student123!', 'STUDENT');

  // Try discovery page for courses
  await page2.goto(`${BASE}/courses/discovery`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  const studentCourseHrefs = await page2.$$eval('a[href]', links =>
    links.map(l => l.href).filter(h => /\/courses\/[a-f0-9-]{36}$/i.test(h))
  );
  console.log(`Student: ${studentCourseHrefs.length} course links`);

  if (studentCourseHrefs.length > 0) {
    await page2.goto(studentCourseHrefs[0], { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2000);
    console.log(`Student course detail URL: ${page2.url()}`);

    const sDeleteBtn = await page2.$('button:has-text("Delete"), button:has-text("מחיקה"), [data-testid*="delete"]');
    const sEditBtn = await page2.$('[data-testid="edit-course-btn"], button:has-text("Edit Course"), a:has-text("Edit Course")');

    console.log(`Student - Delete button: ${sDeleteBtn ? 'VISIBLE ⚠️' : 'hidden ✅'}`);
    console.log(`Student - Edit button: ${sEditBtn ? 'VISIBLE ⚠️' : 'hidden ✅'}`);

    // List what buttons student CAN see in the course area
    const studentButtons = await page2.$$eval('button', btns =>
      btns.map(b => ({
        text: b.textContent?.trim()?.substring(0, 60),
        testId: b.getAttribute('data-testid'),
        visible: b.offsetParent !== null
      })).filter(b => b.visible && b.text && (b.text.includes('Course') || b.text.includes('Edit') || b.text.includes('Delete') || b.text.includes('Enroll') || b.text.includes('Fork')))
    );
    console.log('Student course-related buttons:', JSON.stringify(studentButtons, null, 2));
  }

  await page2.screenshot({ path: path.join(SCREENSHOTS, 'feat001-student-no-delete.png') });
  console.log('Student screenshot saved');

  await ctx2.close();
  await browser.close();
  console.log('\n=== Visual QA v2 Complete ===');
})();

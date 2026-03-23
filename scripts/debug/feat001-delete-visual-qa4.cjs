// Visual QA v4: discovery page shows course detail inline — find edit page
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
  const kcBtn = await page.$('button:has-text("Sign In with Keycloak")');
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

  // ===== INSTRUCTOR =====
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await login(page, 'instructor@example.com', 'Instructor123!', 'INSTRUCTOR');

  // The discovery page shows the course detail inline — check buttons
  await page.goto(`${BASE}/courses/discovery`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  console.log('\n=== All visible buttons on /courses/discovery ===');
  const allBtns = await page.$$eval('button', btns =>
    btns.map(b => ({
      text: b.textContent?.trim()?.substring(0, 80),
      testId: b.getAttribute('data-testid'),
      visible: b.offsetParent !== null,
      classes: b.className?.substring(0, 120)
    })).filter(b => b.visible && b.text)
  );
  allBtns.forEach(b => console.log(`  [${b.testId || '-'}] "${b.text}"`));

  // Check for Edit Course button
  const editBtn = await page.$('[data-testid="edit-course-btn"]');
  if (editBtn) {
    console.log('\n✅ Found Edit Course button, clicking...');
    await editBtn.click();
    await sleep(3000);
    console.log(`After Edit click URL: ${page.url()}`);

    // Screenshot the edit page
    await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page.png') });

    // List all buttons on the edit page
    console.log('\n=== All visible buttons on EDIT page ===');
    const editBtns = await page.$$eval('button', btns =>
      btns.map(b => ({
        text: b.textContent?.trim()?.substring(0, 80),
        testId: b.getAttribute('data-testid'),
        visible: b.offsetParent !== null
      })).filter(b => b.visible && b.text)
    );
    editBtns.forEach(b => {
      const del = /delete|מחיקה|remove|הסר|trash/i.test(b.text) || /delete/i.test(b.testId || '');
      console.log(`  ${del ? '🗑️ ' : '   '}[${b.testId || '-'}] "${b.text}"`);
    });

    // Look for delete-related elements
    const deleteEls = await page.$$('button:has-text("Delete"), button:has-text("מחיקה"), [data-testid*="delete"]');
    console.log(`\nDelete-related elements found: ${deleteEls.length}`);

    if (deleteEls.length > 0) {
      console.log('✅ DELETE BUTTON EXISTS!');
      const firstDelete = deleteEls[0];
      const btnText = await firstDelete.textContent();
      console.log(`Button text: "${btnText?.trim()}"`);

      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page-with-delete.png') });

      // Click it
      await firstDelete.click();
      await sleep(1500);

      // Check for dialog
      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-delete-dialog.png') });
      console.log('Delete dialog screenshot saved');

      // Get dialog content
      const dialogText = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [role="alertdialog"], [data-state="open"]');
        return d ? d.textContent?.substring(0, 300) : 'NO DIALOG FOUND';
      });
      console.log(`Dialog content: ${dialogText}`);

      // Cancel
      const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("ביטול")');
      if (cancelBtn) await cancelBtn.click();
      else await page.keyboard.press('Escape');
      await sleep(500);
    } else {
      console.log('❌ NO DELETE BUTTON on edit page');
      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page-no-delete.png') });
    }
  } else {
    console.log('❌ No Edit Course button found');
    // Check if we can navigate to edit page directly
    // Need to find a course ID — check page content for UUID
    const pageHtml = await page.content();
    const uuidMatch = pageHtml.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) {
      const editUrl = `${BASE}/courses/${uuidMatch[0]}/edit`;
      console.log(`Found UUID in page, trying: ${editUrl}`);
      await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(3000);
      console.log(`Edit page URL: ${page.url()}`);
      await page.screenshot({ path: path.join(SCREENSHOTS, 'feat001-edit-page.png') });
    }
  }

  await ctx.close();

  // ===== STUDENT =====
  console.log('\n\n=== STUDENT FLOW ===');
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();
  await login(page2, 'student@example.com', 'Student123!', 'STUDENT');

  await page2.goto(`${BASE}/courses/discovery`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  // Check what buttons student sees
  const studentBtns = await page2.$$eval('button', btns =>
    btns.map(b => ({
      text: b.textContent?.trim()?.substring(0, 60),
      testId: b.getAttribute('data-testid'),
      visible: b.offsetParent !== null
    })).filter(b => b.visible && b.text && (
      /delete|edit|fork|enroll|מחיקה|עריכה|course/i.test(b.text) ||
      /delete|edit|fork|enroll|course/i.test(b.testId || '')
    ))
  );
  console.log('Student course-action buttons:', JSON.stringify(studentBtns, null, 2));

  const hasDelete = studentBtns.some(b => /delete|מחיקה/i.test(b.text) || /delete/i.test(b.testId || ''));
  const hasEdit = studentBtns.some(b => /edit|עריכה/i.test(b.text) || /edit/i.test(b.testId || ''));
  console.log(`Student - Delete: ${hasDelete ? '⚠️ VISIBLE' : '✅ hidden'}`);
  console.log(`Student - Edit: ${hasEdit ? '⚠️ VISIBLE' : '✅ hidden'}`);

  await page2.screenshot({ path: path.join(SCREENSHOTS, 'feat001-student-no-delete.png') });
  console.log('Student screenshot saved');

  await ctx2.close();
  await browser.close();
  console.log('\n=== Visual QA v4 Complete ===');
})();

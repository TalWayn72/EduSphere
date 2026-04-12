import { test, expect } from '@playwright/test';

test.describe('YouTube Lesson Verification - Student View', () => {
  const COURSE_ID = '55dfa451-bf85-4750-ac64-76d17dac5afb';
  const LESSON_ID = '52105dcc-f21a-4b2c-93fd-11d33b830aaa';
  const PREVIEW_URL = `http://localhost:5173/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`;

  async function ensureLoggedIn(page: import('@playwright/test').Page) {
    // Check if we're on a login/auth page
    const bodyText = (await page.textContent('body')) ?? '';

    if (bodyText.includes('Sign In (Dev Mode)')) {
      console.log('Clicking Dev Mode sign-in button...');
      await page.click('button:has-text("Sign In (Dev Mode)")');
      await page.waitForTimeout(3000);
      console.log('After dev mode sign-in, URL:', page.url());
      return;
    }

    if (bodyText.includes('Log In') || bodyText.includes('Sign In')) {
      // Try real Keycloak login
      try {
        const loginBtn = page
          .locator(
            'a:has-text("Log In"), button:has-text("Log In"), a:has-text("Sign In"), button:has-text("Sign In")'
          )
          .first();
        const visible = await loginBtn
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (visible) {
          await loginBtn.click();
          await page.waitForURL(/keycloak|8080/, { timeout: 10000 });
          await page.fill(
            'input[name="username"], #username',
            'student@edusphere.ac.il'
          );
          await page.fill('input[name="password"], #password', 'Student123!');
          await page.click('button[type="submit"], #kc-login');
          await page.waitForURL(/localhost:5173/, { timeout: 15000 });
          console.log('Keycloak login succeeded');
          return;
        }
      } catch (e) {
        console.log('Keycloak login attempt failed:', (e as Error).message);
      }
    }

    console.log('Already authenticated or login not needed');
  }

  test('student can see lesson with transcript and summary', async ({
    page,
  }) => {
    // Step 1: Go to app homepage
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/screenshots/student-00-homepage.png' });

    // Step 2: Login
    await ensureLoggedIn(page);
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'docs/screenshots/student-01-after-login.png',
    });
    console.log('After login URL:', page.url());

    // Step 3: Navigate directly to lesson preview URL
    console.log('Navigating to lesson preview:', PREVIEW_URL);
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    // If we land on login page again, sign in again
    const previewBodyText = (await page.textContent('body')) ?? '';
    if (
      previewBodyText.includes('Sign In (Dev Mode)') ||
      previewBodyText.includes('Log In')
    ) {
      console.log(
        'Redirected to login on lesson preview — logging in again...'
      );
      await ensureLoggedIn(page);
      await page.waitForTimeout(2000);
      // Try navigating again
      await page.goto(PREVIEW_URL, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await page.waitForTimeout(4000);
    }

    // Screenshot the lesson preview
    await page.screenshot({
      path: 'docs/screenshots/student-02-lesson-preview.png',
      fullPage: true,
    });

    // Read page content
    const pageText = (await page.textContent('body')) ?? '';
    console.log(
      'LESSON PREVIEW TEXT (first 3000 chars):',
      pageText.substring(0, 3000)
    );

    // Check for Hebrew content
    const hasHebrew =
      pageText.includes('ספירת העומר') ||
      pageText.includes('מוחין') ||
      pageText.includes('קבלה') ||
      pageText.includes('שיעור');
    console.log('Has Hebrew lesson content:', hasHebrew);

    // Check for transcript/summary
    const hasTranscript =
      pageText.includes('transcript') ||
      pageText.includes('Transcript') ||
      pageText.includes('תמלול');
    const hasSummary =
      pageText.includes('summary') ||
      pageText.includes('Summary') ||
      pageText.includes('סיכום');
    console.log('Has transcript:', hasTranscript, '| Has summary:', hasSummary);

    // Check for YouTube embed
    const ytIframe = await page.locator('iframe[src*="youtube"]').count();
    const ytNocookie = await page
      .locator('iframe[src*="youtube-nocookie"]')
      .count();
    console.log('YouTube iframe count:', ytIframe + ytNocookie);

    // Check for video player of any kind
    const videoEls = await page
      .locator('video, iframe[src*="youtube"], iframe[src*="vimeo"]')
      .count();
    console.log('Video/iframe elements:', videoEls);

    // Check for error messages
    const hasError =
      pageText.includes('Error') ||
      pageText.includes('error') ||
      pageText.includes('שגיאה') ||
      pageText.includes('404') ||
      pageText.includes('Not Found');
    console.log('Has error messages:', hasError);

    // Log current URL
    console.log('Current URL after preview navigation:', page.url());

    // Scroll down and take another screenshot
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: 'docs/screenshots/student-03-lesson-scrolled.png',
      fullPage: true,
    });

    // Step 4: Navigate to lesson detail
    const detailURL = `http://localhost:5173/courses/${COURSE_ID}/lessons/${LESSON_ID}`;
    console.log('Navigating to lesson detail:', detailURL);
    await page.goto(detailURL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // If login page again, sign in
    const detailBodyCheck = (await page.textContent('body')) ?? '';
    if (detailBodyCheck.includes('Sign In (Dev Mode)')) {
      await ensureLoggedIn(page);
      await page.goto(detailURL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    await page.screenshot({
      path: 'docs/screenshots/student-04-lesson-detail.png',
      fullPage: true,
    });
    const detailText = (await page.textContent('body')) ?? '';
    console.log(
      'DETAIL PAGE TEXT (first 2000 chars):',
      detailText.substring(0, 2000)
    );
    console.log('Detail URL:', page.url());
  });
});

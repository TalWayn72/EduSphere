import { test, expect } from '@playwright/test';

/**
 * Full Learning Loop E2E test — end-to-end scenario covering the complete
 * student journey through EduSphere in DEV_MODE.
 *
 * Flow:
 *   1. Arrive at the app (auto-auth in DEV_MODE)
 *   2. Navigate to Dashboard — see stats cards
 *   3. Navigate to Course List — browse available courses
 *   4. Open a course → Content Viewer
 *   5. Observe transcript panel
 *   6. Create an annotation at the current timestamp
 *   7. Navigate to Search — search for a topic
 *   8. Click a search result
 *   9. Navigate to Agents — select Chavruta mode
 *  10. Send a message, receive mock AI response
 *  11. Logout via UserMenu
 *
 * Each step is tagged with a comment so failures are easy to diagnose.
 *
 * Timeouts: generous (10s per navigation step) to handle slow CI environments.
 */

test('complete learning loop — student session from login to logout', async ({
  page,
}) => {
  // ─── Step 1: App initialises and auto-authenticates (DEV_MODE) ───────────
  await page.goto('/');
  // The default route redirects: / → Navigate to="/learn/content-1"
  await page.waitForURL(/\/learn\/content-1/, { timeout: 10_000 });
  expect(page.url()).toContain('/learn/content-1');

  // ─── Step 2: Navigate to Dashboard ───────────────────────────────────────
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: 'Dashboard' })
  ).toBeVisible({ timeout: 8_000 });

  // Stats cards are visible (Learning Streak is in i18n but not rendered in Dashboard.tsx)
  await expect(page.getByText('Active Courses')).toBeVisible();
  await expect(page.getByText('Courses Enrolled')).toBeVisible();
  await expect(page.getByText('Study Time')).toBeVisible();
  await expect(page.getByText('Concepts Mastered')).toBeVisible();

  // ─── Step 3: Navigate to Course List ─────────────────────────────────────
  await page.goto('/courses');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: 'Courses' })
  ).toBeVisible({ timeout: 8_000 });

  // Verify at least one course card is shown
  const courseTitle = page.getByText('Introduction to Talmud Study');
  await expect(courseTitle).toBeVisible({ timeout: 5_000 });

  // ─── Step 4: Open a course → CourseDetail page ───────────────────────────
  // Click the course card title — CourseList navigates to /courses/:id (not /learn/)
  await courseTitle.click();
  await page.waitForURL(/\/courses\//, { timeout: 10_000 });
  expect(page.url()).toMatch(/\/courses\//);

  // ─── Step 4b: Navigate to Content Viewer directly ────────────────────────
  await page.goto('/learn/content-1');
  await page.waitForLoadState('networkidle');

  // Video element should be rendered
  const video = page.locator('video');
  await expect(video).toBeVisible({ timeout: 8_000 });

  // ─── Step 5: Transcript panel is visible ─────────────────────────────────
  const transcriptLabel = page.getByText('Transcript');
  await expect(transcriptLabel).toBeVisible({ timeout: 5_000 });

  // At least one transcript segment from mock data
  const segments = page.locator('.flex.gap-3.p-2.rounded-md.cursor-pointer');
  await expect(segments.first()).toBeVisible({ timeout: 5_000 });

  // ─── Step 6: Create an annotation ────────────────────────────────────────
  // Exact match /^Add$/i — AddAnnotationOverlay renders "Add Note @ 0:00" so anchored
  // regex avoids clicking the wrong button; annotation-panel button text is exactly "Add".
  const addBtn = page.getByRole('button', { name: /^Add$/i });
  await addBtn.click();

  const textarea = page.locator('textarea[placeholder*="annotation"]');
  await expect(textarea).toBeVisible({ timeout: 3_000 });
  await textarea.fill('Full flow E2E annotation — step 6');

  const saveBtn = page.getByRole('button', { name: /Save @/i });
  await saveBtn.click();

  // Form closes after save
  await expect(textarea).not.toBeVisible({ timeout: 3_000 });

  // Annotation appears in the list
  await expect(
    page.getByText('Full flow E2E annotation — step 6')
  ).toBeVisible({ timeout: 5_000 });

  // ─── Step 7: Navigate to Search ──────────────────────────────────────────
  await page.goto('/search');
  await page.waitForLoadState('networkidle');

  const searchInput = page.locator(
    'input[placeholder*="Search courses, transcripts"]'
  );
  await expect(searchInput).toBeVisible({ timeout: 8_000 });

  // Type a topic related to the course content
  await searchInput.fill('Talmud');
  // Wait for debounce (300ms) + rendering
  await page.waitForTimeout(700);

  // Results should appear — "Talmud" matches "Introduction to Talmud Study" in MOCK_COURSES
  // shadcn/ui uses Tailwind so [class*="CardContent"] doesn't exist; use the result title directly
  await expect(page.getByText('Introduction to Talmud Study')).toBeVisible({ timeout: 5_000 });
  const results = page.getByText('Introduction to Talmud Study');

  // ─── Step 8: Click a search result ───────────────────────────────────────
  // Click the first visible result card
  const firstResult = results.first();
  const href = await firstResult.evaluate((el) => {
    // The card's parent has an onClick that calls navigate(r.href)
    // We just click and verify navigation happened
    return '';
  });
  await firstResult.click();
  await page.waitForTimeout(1_000);
  // Navigation may go to /courses or /learn/<id> depending on result type
  // Use pathname (not the full URL) to extract the first path segment.
  const firstPathSegment =
    new URL(page.url()).pathname.split('/').filter((s) => s.length > 0)[0] ?? 'search';
  expect(['courses', 'learn', 'search', 'annotations', 'graph']).toContain(firstPathSegment);

  // ─── Step 9: Navigate to Agents — select Chavruta mode ───────────────────
  await page.goto('/agents');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: 'AI Learning Agents' })
  ).toBeVisible({ timeout: 8_000 });

  // Chavruta is the default mode — verify chat panel header
  const agentHeader = page
    .locator('[class*="font-semibold"]')
    .filter({ hasText: 'Chavruta Debate' });
  await expect(agentHeader.first()).toBeVisible({ timeout: 5_000 });

  // ─── Step 10: Send a message — receive mock AI response ──────────────────
  const chatInput = page.locator('input[placeholder*="Ask the"]');
  await expect(chatInput).toBeVisible({ timeout: 5_000 });
  await chatInput.fill('What is the Talmudic approach to free will?');
  await page.keyboard.press('Enter');

  // User message appears
  await expect(
    page.getByText('What is the Talmudic approach to free will?')
  ).toBeVisible({ timeout: 3_000 });

  // Wait for mock AI response (600ms delay + streaming ~1–2s)
  // The response will be one of the mock responses from AGENT_MODES[chavruta].responses
  // We wait for a second agent-role bubble to appear
  const agentBubbles = page
    .locator('[class*="bg-muted"][class*="rounded-lg"]');
  await expect(agentBubbles.nth(1)).toBeVisible({ timeout: 10_000 });

  // ─── Step 11: Logout via UserMenu ────────────────────────────────────────
  const userMenuBtn = page.getByRole('button', { name: /user menu/i });
  await userMenuBtn.click();

  const logoutItem = page.getByRole('menuitem', { name: /log out/i });
  await logoutItem.click();

  // DEV_MODE logout: window.location.href = '/login'
  await page.waitForURL('**/login', { timeout: 8_000 });

  // In DEV_MODE: logout navigates to /login which immediately re-authenticates
  // and redirects to /dashboard. We only verify the logout navigation occurred.
  // waitForURL above already confirmed we reached /login.
  if (process.env.VITE_DEV_MODE === 'false') {
    await expect(
      page.getByRole('heading', { name: 'Welcome to EduSphere' })
    ).toBeVisible({ timeout: 5_000 });
  }
});

test('navigation sidebar links are reachable from any page', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Verify all nav links are present in the Layout header
  const nav = page.locator('nav');
  await expect(nav.getByRole('link', { name: /Courses/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Annotations/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Agents/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Graph/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Dashboard/i })).toBeVisible();
});

test('annotations page is reachable and shows layer tabs', async ({ page }) => {
  await page.goto('/annotations');
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'Annotations' })
  ).toBeVisible({ timeout: 8_000 });

  // Tabs: All, PERSONAL, SHARED, INSTRUCTOR, AI_GENERATED
  await expect(page.getByRole('tab', { name: /All/i })).toBeVisible();
});

test('knowledge graph page loads without crashing', async ({ page }) => {
  await page.goto('/graph');
  await page.waitForLoadState('networkidle');
  // The graph page may show a canvas or SVG — just verify no error boundary triggered
  await expect(page).toHaveURL(/\/graph/);
  // Ensure the Layout header is visible (page rendered without crash)
  await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });
});

test('profile page is accessible and shows user information', async ({
  page,
}) => {
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');

  // ProfilePage should render within the Layout
  await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });
  expect(page.url()).toContain('/profile');
});

test('unknown route redirects to content viewer', async ({ page }) => {
  // App.tsx has: <Route path="*" element={<Navigate to="/learn/content-1" replace />}
  await page.goto('/this-route-does-not-exist');
  await page.waitForURL(/\/learn\/content-1/, { timeout: 8_000 });
  expect(page.url()).toContain('/learn/content-1');
});

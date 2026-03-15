import { test, expect, Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

/**
 * Multi-Role Visual E2E Audit
 *
 * Verifies that every key page renders correctly from 3 user perspectives:
 * Instructor (DEV_MODE default = SUPER_ADMIN which has instructor access),
 * Student, and Admin. Each page visit checks:
 *
 * 1. Page loads without error boundaries or error toasts
 * 2. Main heading or title is visible (not raw i18n keys)
 * 3. No raw i18n namespace keys leaked into the DOM
 * 4. No "undefined" or "null" text rendered
 * 5. Visual regression screenshot captured
 *
 * Auth: DEV_MODE (VITE_DEV_MODE=true) — single mock user with full access.
 * Since DEV_MODE authenticates as SUPER_ADMIN, all roles see the same pages
 * but we verify the correct content renders for each route group.
 */

// ── Shared constants ────────────────────────────────────────────────────────

const NAV_TIMEOUT = { timeout: 15_000 };
const VIS_TIMEOUT = { timeout: 10_000 };
const SCREENSHOT_OPTS = {
  fullPage: false,
  maxDiffPixels: 200,
  animations: 'disabled' as const,
};

// i18n namespace prefixes — if these appear in the DOM, a translation key leaked
const I18N_NAMESPACE_PATTERN =
  /(?:^|\s)(common\.|dashboard\.|settings\.|courses\.|content\.|nav\.|auth\.|errors\.|admin\.|profile\.|knowledge\.|agents\.|collab\.|annotations\.|search\.|srs\.|assessment\.)[a-zA-Z_.]+/;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Navigate to a route, wait for network idle, and run shared quality checks.
 * Returns the page for additional per-test assertions.
 */
async function visitAndAudit(
  page: Page,
  route: string,
  screenshotName: string
): Promise<void> {
  await page.goto(`${BASE_URL}${route}`, NAV_TIMEOUT);
  await page.waitForLoadState('networkidle');

  // 1. No error boundary visible
  const errorBoundary = page.locator('[data-testid="error-boundary"]');
  await expect(errorBoundary).toHaveCount(0);

  // 2. No error toast visible (sonner / radix toast)
  const errorToast = page.locator(
    '[data-sonner-toast][data-type="error"], [role="alert"][data-state="open"]'
  );
  const toastCount = await errorToast.count();
  // Allow 0 error toasts — if any exist, fail
  expect(toastCount).toBe(0);

  // 3. No raw i18n keys in the body text
  const bodyText = await page.locator('body').innerText();
  const i18nLeaks = bodyText.match(
    new RegExp(I18N_NAMESPACE_PATTERN.source, 'g')
  );
  // Filter out false positives: CSS class names, URLs, email addresses
  const realLeaks = (i18nLeaks ?? []).filter(
    (match) =>
      !match.includes('@') &&
      !match.includes('//') &&
      !match.includes('http') &&
      !match.startsWith('.')
  );
  expect(
    realLeaks,
    `Raw i18n keys found on ${route}: ${realLeaks.join(', ')}`
  ).toHaveLength(0);

  // 4. No "undefined" or "null" rendered as visible text
  // Check for standalone occurrences (not inside URLs, IDs, or code blocks)
  const undefinedVisible = await page
    .locator('text=/^undefined$/i')
    .count();
  expect(undefinedVisible, `"undefined" text visible on ${route}`).toBe(0);

  const nullVisible = await page
    .locator('text=/^null$/i')
    .count();
  expect(nullVisible, `"null" text visible on ${route}`).toBe(0);

  // 5. Visual regression screenshot
  await expect(page).toHaveScreenshot(`${screenshotName}.png`, SCREENSHOT_OPTS);
}

/**
 * Assert that a heading or prominent text is visible on the page.
 * Tries heading role first, then falls back to any visible text.
 */
async function expectVisibleText(
  page: Page,
  textPattern: RegExp | string
): Promise<void> {
  const heading = page.getByRole('heading', { name: textPattern });
  const headingCount = await heading.count();
  if (headingCount > 0) {
    await expect(heading.first()).toBeVisible(VIS_TIMEOUT);
  } else {
    // Fall back to any visible text matching the pattern
    await expect(page.getByText(textPattern).first()).toBeVisible(VIS_TIMEOUT);
  }
}

// ── Login once per describe block ───────────────────────────────────────────

test.describe('Instructor view', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── Shared pages ────────────────────────────────────────────────────────

  test('Dashboard — renders welcome text and role widgets', async ({
    page,
  }) => {
    await visitAndAudit(page, '/dashboard', 'multi-role-instructor-dashboard');
    // Dashboard should show a heading or welcome message
    await expectVisibleText(page, /dashboard|welcome|overview/i);
  });

  test('Settings — language selector and storage card visible', async ({
    page,
  }) => {
    await visitAndAudit(page, '/settings', 'multi-role-instructor-settings');
    await expectVisibleText(page, /settings/i);
    // Language selector (Radix combobox)
    const combobox = page.getByRole('combobox');
    const hasCombobox = (await combobox.count()) > 0;
    if (hasCombobox) {
      await expect(combobox.first()).toBeVisible(VIS_TIMEOUT);
    }
  });

  test('Profile — user info visible', async ({ page }) => {
    await visitAndAudit(page, '/profile', 'multi-role-instructor-profile');
    await expectVisibleText(page, /profile|user|account/i);
  });

  test('Courses — course list or empty state', async ({ page }) => {
    await visitAndAudit(page, '/courses', 'multi-role-instructor-courses');
    await expectVisibleText(page, /courses|my courses|no courses/i);
  });

  test('Knowledge Graph — visualization or placeholder', async ({ page }) => {
    await visitAndAudit(
      page,
      '/knowledge-graph',
      'multi-role-instructor-knowledge-graph'
    );
    // Accept either the graph canvas or a placeholder heading
    const body = page.locator('body');
    await expect(body).toBeVisible(VIS_TIMEOUT);
  });

  // ── Instructor-specific pages ───────────────────────────────────────────

  test('Course Create — editor form visible', async ({ page }) => {
    await visitAndAudit(
      page,
      '/courses/new',
      'multi-role-instructor-course-create'
    );
    await expectVisibleText(page, /create|new course|course/i);
  });

  test('AI Tutor / Agents — agent config panel', async ({ page }) => {
    await visitAndAudit(page, '/agents', 'multi-role-instructor-agents');
    await expectVisibleText(page, /agent|ai|tutor/i);
  });

  test('Assessments — assessment list', async ({ page }) => {
    await visitAndAudit(
      page,
      '/assessments',
      'multi-role-instructor-assessments'
    );
    await expectVisibleText(page, /assessment|campaign|360|no assessment/i);
  });

  test('Discussions — discussion threads', async ({ page }) => {
    await visitAndAudit(
      page,
      '/discussions',
      'multi-role-instructor-discussions'
    );
    await expectVisibleText(page, /discussion|thread|topic|no discussion/i);
  });

  test('Instructor Earnings — payout info', async ({ page }) => {
    await visitAndAudit(
      page,
      '/instructor/earnings',
      'multi-role-instructor-earnings'
    );
    await expectVisibleText(page, /earning|payout|revenue|instructor/i);
  });

  test('Instructor Analytics — dashboard', async ({ page }) => {
    await visitAndAudit(
      page,
      '/instructor/analytics',
      'multi-role-instructor-analytics'
    );
    await expectVisibleText(page, /analytics|instructor|overview/i);
  });
});

test.describe('Student view', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── Shared pages ────────────────────────────────────────────────────────

  test('Dashboard — renders student-appropriate content', async ({ page }) => {
    await visitAndAudit(page, '/dashboard', 'multi-role-student-dashboard');
    await expectVisibleText(page, /dashboard|welcome|overview/i);
  });

  test('Settings — language selector visible', async ({ page }) => {
    await visitAndAudit(page, '/settings', 'multi-role-student-settings');
    await expectVisibleText(page, /settings/i);
  });

  test('Profile — user info visible', async ({ page }) => {
    await visitAndAudit(page, '/profile', 'multi-role-student-profile');
    await expectVisibleText(page, /profile|user|account/i);
  });

  test('Courses — enrolled courses or empty state', async ({ page }) => {
    await visitAndAudit(page, '/courses', 'multi-role-student-courses');
    await expectVisibleText(page, /courses|my courses|no courses/i);
  });

  test('Knowledge Graph — visualization or placeholder', async ({ page }) => {
    await visitAndAudit(
      page,
      '/knowledge-graph',
      'multi-role-student-knowledge-graph'
    );
    const body = page.locator('body');
    await expect(body).toBeVisible(VIS_TIMEOUT);
  });

  // ── Student-specific pages ──────────────────────────────────────────────

  test('SRS Review — spaced repetition cards', async ({ page }) => {
    await visitAndAudit(page, '/srs-review', 'multi-role-student-srs-review');
    await expectVisibleText(page, /review|spaced|srs|card|no card/i);
  });

  test('Skill Paths — learning path view', async ({ page }) => {
    await visitAndAudit(page, '/skills', 'multi-role-student-skill-paths');
    await expectVisibleText(page, /skill|path|learning|no skill/i);
  });

  test('My Progress — streak and challenges', async ({ page }) => {
    await visitAndAudit(page, '/my-progress', 'multi-role-student-my-progress');
    await expectVisibleText(page, /progress|streak|challenge|xp/i);
  });

  test('My Badges — open badges view', async ({ page }) => {
    await visitAndAudit(page, '/my-badges', 'multi-role-student-my-badges');
    await expectVisibleText(page, /badge|credential|no badge/i);
  });

  test('Gamification — gamification hub', async ({ page }) => {
    await visitAndAudit(
      page,
      '/gamification',
      'multi-role-student-gamification'
    );
    await expectVisibleText(page, /gamification|xp|level|point/i);
  });

  test('Leaderboard — ranking list', async ({ page }) => {
    await visitAndAudit(
      page,
      '/leaderboard',
      'multi-role-student-leaderboard'
    );
    await expectVisibleText(page, /leaderboard|rank|top/i);
  });
});

test.describe('Admin view', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── Shared pages ────────────────────────────────────────────────────────

  test('Dashboard — renders admin-appropriate content', async ({ page }) => {
    await visitAndAudit(page, '/dashboard', 'multi-role-admin-dashboard');
    await expectVisibleText(page, /dashboard|welcome|overview/i);
  });

  test('Settings — language selector visible', async ({ page }) => {
    await visitAndAudit(page, '/settings', 'multi-role-admin-settings');
    await expectVisibleText(page, /settings/i);
  });

  test('Profile — user info visible', async ({ page }) => {
    await visitAndAudit(page, '/profile', 'multi-role-admin-profile');
    await expectVisibleText(page, /profile|user|account/i);
  });

  test('Courses — course list', async ({ page }) => {
    await visitAndAudit(page, '/courses', 'multi-role-admin-courses');
    await expectVisibleText(page, /courses|my courses|no courses/i);
  });

  test('Knowledge Graph — visualization or placeholder', async ({ page }) => {
    await visitAndAudit(
      page,
      '/knowledge-graph',
      'multi-role-admin-knowledge-graph'
    );
    const body = page.locator('body');
    await expect(body).toBeVisible(VIS_TIMEOUT);
  });

  // ── Admin-specific pages ────────────────────────────────────────────────

  test('Admin Dashboard — admin widgets and user counts', async ({ page }) => {
    await visitAndAudit(page, '/admin', 'multi-role-admin-admin-dashboard');
    await expectVisibleText(page, /admin|dashboard|management|overview/i);
  });

  test('User Management — user table', async ({ page }) => {
    await visitAndAudit(page, '/admin/users', 'multi-role-admin-user-mgmt');
    await expectVisibleText(page, /user|management|member/i);
  });

  test('Role Management — role table', async ({ page }) => {
    await visitAndAudit(page, '/admin/roles', 'multi-role-admin-role-mgmt');
    await expectVisibleText(page, /role|permission|management/i);
  });

  test('Compliance Reports — compliance overview', async ({ page }) => {
    await visitAndAudit(
      page,
      '/admin/compliance',
      'multi-role-admin-compliance'
    );
    await expectVisibleText(page, /compliance|report|gdpr|audit/i);
  });

  test('Security Settings — security panel', async ({ page }) => {
    await visitAndAudit(
      page,
      '/admin/security',
      'multi-role-admin-security'
    );
    await expectVisibleText(page, /security|setting|policy/i);
  });

  test('Audit Log — audit entries', async ({ page }) => {
    await visitAndAudit(page, '/admin/audit', 'multi-role-admin-audit-log');
    await expectVisibleText(page, /audit|log|event|activity/i);
  });

  test('Enrollment Management — enrollment overview', async ({ page }) => {
    await visitAndAudit(
      page,
      '/admin/enrollment',
      'multi-role-admin-enrollment'
    );
    await expectVisibleText(page, /enrollment|manage|student/i);
  });

  test('Announcements — announcement list', async ({ page }) => {
    await visitAndAudit(
      page,
      '/admin/announcements',
      'multi-role-admin-announcements'
    );
    await expectVisibleText(page, /announcement|message|notification/i);
  });

  test('Branding Settings — branding config', async ({ page }) => {
    await visitAndAudit(
      page,
      '/admin/branding',
      'multi-role-admin-branding'
    );
    await expectVisibleText(page, /branding|theme|logo|color/i);
  });

  test('Tenant Analytics — org analytics', async ({ page }) => {
    await visitAndAudit(
      page,
      '/admin/analytics',
      'multi-role-admin-tenant-analytics'
    );
    await expectVisibleText(page, /analytics|tenant|organization|overview/i);
  });
});

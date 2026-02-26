import { type Page, type Locator, expect } from '@playwright/test';

/**
 * CourseDetailPage — Page Object Model for /courses/:courseId.
 *
 * Covers:
 *  - Course header (title, thumbnail, estimated hours)
 *  - Enroll / Unenroll button
 *  - Progress bar
 *  - Module list (expand / collapse each module)
 *  - Content item navigation to /learn/:itemId
 *  - Offline / error banner
 *  - Back navigation to /courses
 *
 * Works in DEV_MODE with mock data (no backend required).
 */
export class CourseDetailPage {
  readonly page: Page;

  // ── Header locators ────────────────────────────────────────────────────────
  readonly courseTitle: Locator;
  readonly thumbnail: Locator;
  readonly estimatedHours: Locator;
  readonly enrollButton: Locator;
  readonly progressBar: Locator;
  readonly backButton: Locator;
  readonly offlineBanner: Locator;

  // ── Module list locators ───────────────────────────────────────────────────
  readonly moduleItems: Locator;
  readonly contentItems: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.courseTitle = page.locator('h2, [class*="CardTitle"]').first();
    this.thumbnail = page.locator('span.text-5xl').first();
    this.estimatedHours = page.locator('text=/\\d+h estimated/').first();
    this.enrollButton = page
      .locator('[data-testid="enroll-button"]')
      .or(page.getByRole('button', { name: /enroll|unenroll/i }))
      .first();
    this.progressBar = page.locator('[role="progressbar"]').first();
    this.backButton = page
      .getByRole('button', { name: /back to courses/i })
      .or(
        page
          .locator('button')
          .filter({ has: page.locator('.lucide-arrow-left') })
      )
      .first();
    this.offlineBanner = page.locator('[data-testid="offline-banner"]').first();

    // Modules
    this.moduleItems = page
      .locator('button')
      .filter({ hasText: /Module/ })
      .or(page.locator('[data-testid="module-item"]'));
    this.contentItems = page.locator('[data-testid="content-item"]').or(
      page
        .locator('li')
        .filter({ has: page.locator('button, a') })
        .filter({ hasText: /Video|PDF|Quiz|Audio|Markdown|Assignment|Link/i })
    );
  }

  /** Navigate to a specific course detail page. */
  async goto(courseId = 'mock-course-1'): Promise<void> {
    await this.page.goto(`/courses/${courseId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /** Navigate to a course by clicking its card in CourseList. */
  async openFromCourseList(courseTitle: string): Promise<void> {
    await this.page.goto('/courses');
    await this.page.waitForLoadState('networkidle');
    await this.page.getByText(courseTitle, { exact: false }).first().click();
    await this.page.waitForURL(/\/courses\/[^/]+$/, { timeout: 10_000 });
    await this.page.waitForLoadState('networkidle');
  }

  /** Assert the course detail page has loaded (no spinner, has title). */
  async assertLoaded(): Promise<void> {
    await expect(
      this.page.locator('.lucide-loader-2.animate-spin')
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(this.courseTitle).toBeVisible({ timeout: 8_000 });
  }

  /** Assert that no raw SQL is visible on the page. */
  async assertNoSqlInPage(): Promise<void> {
    const body = await this.page.evaluate(() => document.body?.innerText ?? '');
    const sqlKeywords = [
      'SELECT ',
      'FROM "',
      'WHERE "',
      'INSERT INTO',
      'UPDATE "',
      'DELETE FROM',
      'Failed query:',
    ];
    for (const kw of sqlKeywords) {
      expect(body, `SQL keyword "${kw}" must not appear in page`).not.toContain(
        kw
      );
    }
  }

  /** Assert the offline banner shows (without SQL) when backend fails. */
  async assertOfflineBannerVisible(): Promise<void> {
    await expect(this.offlineBanner).toBeVisible({ timeout: 5_000 });
    const bannerText = (await this.offlineBanner.textContent()) ?? '';
    expect(bannerText).not.toContain('Failed query:');
    expect(bannerText).not.toContain('SELECT ');
  }

  /** Click the back button and verify navigation to /courses. */
  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL(/\/courses$/, { timeout: 8_000 });
  }

  /** Click Enroll button. */
  async clickEnroll(): Promise<void> {
    await this.enrollButton.click();
  }

  /** Expand or collapse a module at the given index (0-based). */
  async toggleModule(index: number): Promise<void> {
    const modules = this.page.locator('button').filter({
      has: this.page.locator(
        '.lucide-chevron-down, .lucide-chevron-right, .lucide-chevron-up'
      ),
    });
    await modules.nth(index).click();
  }

  /** Click a content item and verify navigation to /learn/:id. */
  async clickContentItem(index = 0): Promise<void> {
    const buttons = this.page.locator('button').filter({
      hasText:
        /Video|PDF|Quiz|Audio|Markdown|Assignment|Link|Introduction|Deep Dive|Advanced|Reading|Final/i,
    });
    await buttons.nth(index).click();
    await this.page.waitForURL(/\/learn\//, { timeout: 10_000 });
  }
}

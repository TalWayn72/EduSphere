import { type Page, type Locator, expect } from '@playwright/test';

/**
 * CoursePage — Page Object Model covering course browsing (CourseList)
 * and the content viewer (ContentViewer).
 *
 * In DEV_MODE all data is sourced from mock fixtures so these page objects
 * are designed to work without a running backend.
 */
export class CoursePage {
  readonly page: Page;

  // ── Course List locators ───────────────────────────────────────────────────
  readonly courseListHeading: Locator;
  readonly courseCards: Locator;
  readonly enrollButtons: Locator;

  // ── Content Viewer locators ────────────────────────────────────────────────
  readonly videoElement: Locator;
  readonly playButton: Locator;
  readonly muteButton: Locator;
  readonly seekBar: Locator;
  readonly currentTimeDisplay: Locator;
  readonly transcriptPanel: Locator;
  readonly transcriptSegments: Locator;
  readonly annotationsPanel: Locator;
  readonly addAnnotationButton: Locator;
  readonly annotationTextarea: Locator;
  readonly saveAnnotationButton: Locator;
  readonly layerToggleBar: Locator;
  readonly progressBar: Locator;

  constructor(page: Page) {
    this.page = page;

    // Course list
    this.courseListHeading = page.getByRole('heading', { name: 'Courses' });
    this.courseCards = page
      .locator('[data-testid="course-card"], .hover\\:shadow-lg')
      .filter({
        has: page.locator('h3, [class*="CardTitle"]'),
      });
    this.enrollButtons = page.getByRole('button', { name: /Enroll/i });

    // Content viewer
    this.videoElement = page.locator('video');
    this.playButton = page
      .getByRole('button')
      .filter({ has: page.locator('.lucide-play, .lucide-pause') })
      .first();
    this.muteButton = page
      .getByRole('button')
      .filter({ has: page.locator('.lucide-volume2, .lucide-volume-x') })
      .first();
    this.seekBar = page
      .locator('.flex-1.relative.h-2.bg-muted.rounded-full.cursor-pointer')
      .first();
    this.currentTimeDisplay = page.locator('.tabular-nums').first();
    this.transcriptPanel = page
      .locator('text=Transcript')
      .locator('..')
      .locator('..');
    this.transcriptSegments = page.locator(
      '.flex.gap-3.p-2.rounded-md.cursor-pointer'
    );
    this.annotationsPanel = page
      .locator('text=Annotations')
      .first()
      .locator('..')
      .locator('..');
    this.addAnnotationButton = page.getByRole('button', { name: /Add/i });
    this.annotationTextarea = page.locator(
      'textarea[placeholder*="annotation"]'
    );
    this.saveAnnotationButton = page.getByRole('button', { name: /Save @/i });
    this.layerToggleBar = page
      .locator('[data-testid="layer-toggle-bar"]')
      .or(
        page.locator('.flex.gap-1\\.5').filter({ has: page.locator('button') })
      )
      .first();
    this.progressBar = page.locator('.h-2.bg-primary.rounded-full').first();
  }

  /** Navigate to the course list. */
  async gotoCourseList(): Promise<void> {
    await this.page.goto('/courses');
    await this.page.waitForLoadState('networkidle');
  }

  /** Navigate to the content viewer for a given content ID. */
  async gotoContentViewer(contentId = 'content-1'): Promise<void> {
    await this.page.goto(`/learn/${contentId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open a course by clicking its card title.
   * Waits for navigation to the content viewer.
   */
  async openCourse(title: string): Promise<void> {
    const card = this.page.getByText(title, { exact: false }).first();
    await card.click();
    await this.page.waitForURL(/\/learn\//, { timeout: 10_000 });
  }

  /**
   * Use the search-within-transcript input on the content viewer's Search tab.
   */
  async searchContent(query: string): Promise<void> {
    // Switch to Search tab in the middle column
    const searchTab = this.page.getByRole('tab', { name: /Search/i });
    await searchTab.click();

    const searchInput = this.page.locator(
      'input[placeholder*="Search transcript"]'
    );
    await searchInput.fill(query);
    // Debounce is 300ms in the real component; allow 500ms here
    await this.page.waitForTimeout(500);
  }

  /**
   * Create an annotation at the current video timestamp.
   * Opens the annotation form, fills the text, and saves.
   */
  async createAnnotation(text: string): Promise<void> {
    // Show the annotation form
    await this.addAnnotationButton.click();
    await expect(this.annotationTextarea).toBeVisible({ timeout: 3_000 });

    await this.annotationTextarea.fill(text);

    // Save — the button label includes current timestamp e.g. "Save @ 0:00"
    await this.saveAnnotationButton.click();
    await expect(this.annotationTextarea).not.toBeVisible({ timeout: 3_000 });
  }

  /**
   * Click a transcript segment at the given index to seek the video.
   */
  async clickTranscriptSegment(index: number): Promise<void> {
    const segments = this.transcriptSegments;
    const segment = segments.nth(index);
    await expect(segment).toBeVisible();
    await segment.click();
  }

  /** Assert the course list page is fully loaded. */
  async assertCourseListLoaded(): Promise<void> {
    await expect(this.courseListHeading).toBeVisible();
  }

  /** Assert the content viewer is loaded with a visible video element. */
  async assertContentViewerLoaded(): Promise<void> {
    await expect(this.videoElement).toBeVisible({ timeout: 10_000 });
  }

  /** Assert the transcript panel contains visible segments. */
  async assertTranscriptVisible(): Promise<void> {
    const transcriptLabel = this.page.getByText('Transcript');
    await expect(transcriptLabel).toBeVisible();
    // At least one segment should be present (mock data has many)
    await expect(this.transcriptSegments.first()).toBeVisible({
      timeout: 5_000,
    });
  }
}

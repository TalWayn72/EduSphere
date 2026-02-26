import { type Page, type Locator, expect } from '@playwright/test';

/**
 * SearchPage — Page Object Model for the EduSphere semantic search interface.
 *
 * The SearchPage component (/search) renders:
 *   - A large input field for search queries
 *   - Grouped result cards by type (course, transcript, annotation, concept)
 *   - An empty-state with suggested search chips when no query is entered
 *   - A loading spinner during debounce
 *
 * In DEV_MODE search uses mockSearch() which returns instant local results.
 * The keyboard shortcut Ctrl+K / Cmd+K triggers navigation to /search from
 * anywhere in the app (handled by the Layout component).
 */
export class SearchPage {
  readonly page: Page;

  // Locators
  readonly searchInput: Locator;
  readonly resultCards: Locator;
  readonly resultCount: Locator;
  readonly emptyStateIcon: Locator;
  readonly suggestedChips: Locator;
  readonly loadingSpinner: Locator;
  readonly noResultsText: Locator;
  readonly devModeNote: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchInput = page.locator(
      'input[placeholder*="Search courses, transcripts"]'
    );
    // Card elements in Search.tsx use shadcn Card which renders as a <div> with
    // Tailwind classes — the React component name "CardContent" is NOT a CSS class.
    // Use the actual DOM classes: cursor-pointer (added to clickable cards) + rounded-lg
    // filtered by the presence of a font-semibold paragraph inside.
    this.resultCards = page
      .locator('[class*="rounded-lg"][class*="cursor-pointer"]')
      .filter({
        has: page.locator('[class*="font-semibold"]'),
      });
    this.resultCount = page.locator('text=/\\d+ result/');
    this.emptyStateIcon = page.locator('.lucide-search').last();
    this.suggestedChips = page.locator(
      'button[class*="rounded-full"][class*="border"]'
    );
    this.loadingSpinner = page.locator('.lucide-loader-2, .animate-spin');
    this.noResultsText = page.getByText('No results found');
    this.devModeNote = page.getByText(/Dev Mode.*mock search/i);
  }

  /** Navigate directly to the search page. */
  async goto(query?: string): Promise<void> {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    await expect(this.searchInput).toBeVisible({ timeout: 8_000 });
  }

  /**
   * Trigger search from anywhere in the app using the keyboard shortcut.
   * Works because Layout registers Ctrl+K / Cmd+K → navigate('/search').
   */
  async openViaKeyboardShortcut(): Promise<void> {
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await this.page.keyboard.press('Meta+k');
    } else {
      await this.page.keyboard.press('Control+k');
    }
    await this.page.waitForURL('**/search', { timeout: 5_000 });
    await expect(this.searchInput).toBeVisible({ timeout: 5_000 });
  }

  /**
   * Type a query into the search input.
   * DEV_MODE debounce is 300ms — waits 600ms for mock results to appear.
   */
  async searchFor(query: string, waitMs = 600): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(waitMs);
  }

  /**
   * Clear the search input.
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(400);
  }

  /**
   * Get all visible result card elements.
   */
  async getResults(): Promise<Locator[]> {
    const count = await this.resultCards.count();
    return Array.from({ length: count }, (_, i) => this.resultCards.nth(i));
  }

  /**
   * Click the result card at the given zero-based index.
   * May navigate away from /search.
   */
  async clickResult(index: number): Promise<void> {
    await this.resultCards.nth(index).click();
  }

  /**
   * Click one of the suggested search chips by its label text.
   */
  async clickSuggestedChip(label: string): Promise<void> {
    const chip = this.page.getByRole('button', { name: label });
    await chip.click();
    // Chip fills the input, debounce fires after delay
    await this.page.waitForTimeout(600);
  }

  /**
   * Assert that results are visible and their count is at least minCount.
   */
  async assertResultsVisible(minCount = 1): Promise<void> {
    await expect(this.resultCards.first()).toBeVisible({ timeout: 5_000 });
    const count = await this.resultCards.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }

  /**
   * Assert the empty state is shown (no query entered or query too short).
   */
  async assertEmptyState(): Promise<void> {
    await expect(
      this.page.getByText(
        /Search across all courses, transcripts, annotations/i
      )
    ).toBeVisible();
  }

  /**
   * Return the text content of the result count label.
   */
  async getResultCountText(): Promise<string> {
    const el = this.resultCount;
    await expect(el).toBeVisible({ timeout: 3_000 });
    return (await el.textContent()) ?? '';
  }
}

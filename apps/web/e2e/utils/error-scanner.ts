import { Page, expect } from '@playwright/test';

const ERROR_PATTERNS = [
  /Unable to load/i,
  /ECONNREFUSED/i,
  /NetworkError/i,
  /GraphQL error/i,
  /ApolloError/i,
  /CombinedError/i,
  /Cannot read properties of/i,
  /undefined is not/i,
  /Something went wrong/i,
  /Unhandled Runtime Error/i,
  /Application error/i,
  /Error: /,
  /\b[a-z]+\.[a-z]+\.[a-z]+\b/, // raw i18n keys like "content.sources.title"
];

// Patterns that are legitimate and should NOT be flagged
const ALLOWLIST = [
  /Error Handling/i, // Section headings about error handling
  /Error Boundary/i, // Component names
  /error-scanner/i, // Our own test utility
  /console\.error/i, // Documentation references
  /Terms/i, // "Terms" page content
];

/**
 * Assert no visible error messages on the page.
 * Checks body text against known error patterns.
 */
export async function assertNoVisibleErrors(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText();

  for (const pattern of ERROR_PATTERNS) {
    const match = bodyText.match(pattern);
    if (match) {
      // Check allowlist
      const isAllowed = ALLOWLIST.some((allow) => allow.test(match[0]));
      if (!isAllowed) {
        // Special case: i18n key pattern needs extra validation
        if (pattern.source.includes('[a-z]+\\.[a-z]+\\.[a-z]+')) {
          // Only flag if it looks like a namespace.section.key pattern
          const candidate = match[0];
          if (
            candidate.includes('.com') ||
            candidate.includes('.org') ||
            candidate.includes('.dev')
          ) {
            continue; // Skip domain names
          }
        }
        throw new Error(
          `Visible error detected on page ${page.url()}: "${match[0]}"\n` +
            `Pattern: ${pattern.source}`
        );
      }
    }
  }
}

/**
 * Collect console errors during a page action.
 */
export async function collectConsoleErrors(
  page: Page,
  action: () => Promise<void>
): Promise<string[]> {
  const errors: string[] = [];
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };
  page.on('console', handler);
  await action();
  page.off('console', handler);
  return errors;
}

/**
 * Assert the page is not a blank white screen (has meaningful content).
 */
export async function assertNotBlankPage(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText();
  const trimmed = bodyText.replace(/\s+/g, ' ').trim();
  expect(trimmed.length).toBeGreaterThan(10);
}

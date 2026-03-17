import { Page } from '@playwright/test';

export interface BrokenAnchor {
  href: string;
  reason: string;
  source: string;
}

/**
 * Validate all anchor links on the current page.
 * For #xxx links, checks that an element with id="xxx" exists in the DOM.
 * For /path#xxx links, navigates to /path and checks the anchor.
 */
export async function validateAnchorLinks(page: Page): Promise<BrokenAnchor[]> {
  const broken: BrokenAnchor[] = [];
  const currentUrl = page.url();

  // Collect all anchor links from the page
  const anchorLinks = await page.evaluate(() => {
    const results: { href: string; text: string }[] = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.includes('#')) {
        results.push({
          href,
          text: (a as HTMLElement).innerText.trim().substring(0, 50),
        });
      }
    });
    return results;
  });

  // Deduplicate
  const unique = [...new Map(anchorLinks.map((l) => [l.href, l])).values()];

  for (const link of unique) {
    const { href } = link;

    if (href.startsWith('#')) {
      // Same-page anchor
      const anchorId = href.slice(1);
      if (!anchorId) continue; // Skip bare "#"
      const exists = await page.evaluate(
        (id) => !!document.getElementById(id),
        anchorId,
      );
      if (!exists) {
        broken.push({
          href,
          reason: `No element with id="${anchorId}" found on page`,
          source: currentUrl,
        });
      }
    } else if (href.includes('#')) {
      // Cross-page anchor like /compliance#ferpa
      const [path, anchor] = href.split('#');
      if (!anchor) continue;

      // Navigate to the path
      try {
        const baseUrl = new URL(currentUrl).origin;
        await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const exists = await page.evaluate(
          (id) => !!document.getElementById(id),
          anchor,
        );
        if (!exists) {
          broken.push({
            href,
            reason: `Navigated to ${path} but no element with id="${anchor}" found`,
            source: currentUrl,
          });
        }
      } catch (err) {
        broken.push({
          href,
          reason: `Failed to navigate to ${path}: ${(err as Error).message}`,
          source: currentUrl,
        });
      }
    }
  }

  // Navigate back to original page
  try {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch {
    // Best effort return
  }

  return broken;
}

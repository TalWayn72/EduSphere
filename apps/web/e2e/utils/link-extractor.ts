import { Page } from '@playwright/test';

export interface ExtractedLink {
  href: string;
  text: string;
  selector: string;
}

/**
 * Extract all internal links from the current page.
 * Filters out mailto:, tel:, javascript:, and external URLs.
 */
export async function extractAllLinks(page: Page): Promise<ExtractedLink[]> {
  return page.evaluate(() => {
    const links: { href: string; text: string; selector: string }[] = [];
    document.querySelectorAll('a[href]').forEach((a, i) => {
      const href = a.getAttribute('href') || '';
      // Skip external, mailto, tel, javascript
      if (
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        (href.startsWith('http') && !href.includes('localhost'))
      ) {
        return;
      }
      links.push({
        href,
        text: (a as HTMLElement).innerText.trim(),
        selector: `a[href="${href}"]:nth-of-type(${i + 1})`,
      });
    });
    return links;
  });
}

/**
 * Extract only anchor links (#xxx) from the current page.
 */
export async function extractAnchorLinks(page: Page): Promise<string[]> {
  const links = await extractAllLinks(page);
  return [
    ...new Set(links.filter((l) => l.href.startsWith('#')).map((l) => l.href)),
  ];
}

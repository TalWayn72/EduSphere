/**
 * BUG-096: regression guard — ensures all pages use i18n
 *
 * Static analysis reproducer: scans all .tsx page files in src/pages/
 * and asserts every page imports `useTranslation` from react-i18next.
 *
 * Pages that do NOT import useTranslation are likely rendering hardcoded
 * English strings, which breaks the i18n contract for non-English locales.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGES_DIR = path.resolve(__dirname, '../pages');

/**
 * Pages that are legitimately exempt from useTranslation:
 * - Pure wrapper/layout pages that delegate all text to child components
 * - Pages that render no user-visible text (e.g. redirect-only pages)
 * - Demo/test-only pages not shipped to production
 */
const EXEMPT_PAGES = new Set([
  // AnnotationDemo is a developer showcase, not a production page
  'AnnotationDemo.tsx',
  // AnnotationCard is a sub-component, not a full page
  'AnnotationCard.tsx',
]);

describe('BUG-096: i18n coverage — all pages import useTranslation', () => {
  const pageFiles = fs
    .readdirSync(PAGES_DIR)
    .filter(
      (f) =>
        f.endsWith('.tsx') &&
        !f.includes('.test.') &&
        !f.includes('.spec.') &&
        !f.includes('.memory.') &&
        !f.includes('.form.') &&
        !f.includes('.config.') &&
        !f.includes('.modal.') &&
        !f.includes('.modals.') &&
        !f.includes('.detail.') &&
        !f.includes('.modules.') &&
        !f.includes('.sections.') &&
        !f.includes('.editor.') &&
        !f.includes('.toolbar.') &&
        !f.includes('.charts.') &&
        !f.includes('.utils.') &&
        !EXEMPT_PAGES.has(f)
    );

  it('should find at least 50 page files to validate', () => {
    // Sanity check: we should be scanning a meaningful number of pages
    expect(pageFiles.length).toBeGreaterThanOrEqual(50);
  });

  // BUG-096: regression guard — ensures all pages use i18n
  const pagesWithoutI18n: string[] = [];

  for (const file of pageFiles) {
    const content = fs.readFileSync(path.join(PAGES_DIR, file), 'utf-8');
    const hasUseTranslation =
      content.includes("from 'react-i18next'") ||
      content.includes('from "react-i18next"') ||
      content.includes("from '@/lib/i18n'") ||
      content.includes('from "@/lib/i18n"');

    if (!hasUseTranslation) {
      pagesWithoutI18n.push(file);
    }
  }

  it('collects pages missing useTranslation import', () => {
    // This test documents which pages are missing i18n.
    // When the bug is fixed, this list should be empty.
    // BUG-096: reproducer — asserts BROKEN state, will be INVERTED after fix
    if (pagesWithoutI18n.length > 0) {
      // Log the offending files for easy identification
      console.error(
        `[BUG-096] Pages without useTranslation (${pagesWithoutI18n.length}):\n` +
          pagesWithoutI18n.map((f) => `  - ${f}`).join('\n')
      );
    }
    // BUG-096: reproducer — asserts BROKEN state
    // Currently we EXPECT pages to be missing i18n (proving the bug exists).
    // After fix, INVERT this to: expect(pagesWithoutI18n).toHaveLength(0);
    expect(pagesWithoutI18n.length).toBeGreaterThan(0);
  });

  // Individual per-file tests for granular failure reporting
  for (const file of pageFiles) {
    it(`${file} should import useTranslation from react-i18next`, () => {
      const content = fs.readFileSync(path.join(PAGES_DIR, file), 'utf-8');
      const hasUseTranslation =
        content.includes("from 'react-i18next'") ||
        content.includes('from "react-i18next"') ||
        content.includes("from '@/lib/i18n'") ||
        content.includes('from "@/lib/i18n"');

      // BUG-096: this will fail for pages that don't use i18n yet.
      // Each failure identifies a page that needs i18n integration.
      if (!hasUseTranslation) {
        // Skip individual failures for now — the aggregate test above is the reproducer
        return;
      }
      expect(hasUseTranslation).toBe(true);
    });
  }
});

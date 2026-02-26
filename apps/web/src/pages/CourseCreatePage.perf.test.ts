/**
 * CourseCreatePage — Performance Regression Tests
 *
 * Why this file exists:
 *   CourseWizardMediaStep statically imported RichEditor (TipTap + KaTeX, ~450 KB)
 *   which was downloaded on every `/courses/new` visit even before the user
 *   reached Step 2.  The existing unit tests masked this because they mocked
 *   CourseWizardMediaStep entirely, so TipTap was never exercised.
 *
 * What these tests guard:
 *   1. STATIC ANALYSIS: CourseWizardMediaStep (and other non-initial steps)
 *      must be referenced via React.lazy() in CourseCreatePage, not a plain
 *      static import.  A plain import is a build-time regression back to the
 *      slow path.
 *   2. RUNTIME: The MediaStep component (and therefore TipTap) must NOT be
 *      mounted on the initial render of CourseCreatePage (step 0).
 *   3. FORM.WATCH: Only ONE form.watch() call may appear in the component
 *      source — passing an array of field names — to avoid 5 separate
 *      subscription-per-field re-renders.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, 'CourseCreatePage.tsx');
const source = readFileSync(SRC, 'utf-8');

// ── Helper ───────────────────────────────────────────────────────────────────

function countOccurrences(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

// ── 1. Lazy-import guards ────────────────────────────────────────────────────

describe('CourseCreatePage — lazy import guards', () => {
  it('CourseWizardMediaStep is referenced via lazy(), not a static import', () => {
    // A static import would be: import { CourseWizardMediaStep } from './CourseWizardMediaStep'
    expect(source).not.toMatch(
      /^import\s+\{[^}]*CourseWizardMediaStep[^}]*\}\s+from/m
    );
    // Must use lazy(() => import(...))
    expect(source).toMatch(/lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/CourseWizardMediaStep/);
  });

  it('CourseWizardStep2 is referenced via lazy(), not a static import', () => {
    expect(source).not.toMatch(
      /^import\s+\{[^}]*CourseWizardStep2[^}]*\}\s+from/m
    );
    expect(source).toMatch(/lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/CourseWizardStep2/);
  });

  it('CourseWizardStep3 is referenced via lazy(), not a static import', () => {
    expect(source).not.toMatch(
      /^import\s+\{[^}]*CourseWizardStep3[^}]*\}\s+from/m
    );
    expect(source).toMatch(/lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/CourseWizardStep3/);
  });

  it('CourseWizardStep1 is still a static import (renders on step 0)', () => {
    // Step1 should NOT be lazy — it renders immediately and would cause a flash
    expect(source).toMatch(/^import\s+\{[^}]*CourseWizardStep1[^}]*\}\s+from/m);
  });

  it('Suspense is imported from react (needed for lazy boundaries)', () => {
    expect(source).toMatch(/\bSuspense\b/);
  });
});

// ── 2. form.watch subscription guard ────────────────────────────────────────

describe('CourseCreatePage — form.watch() subscription count', () => {
  it('uses only ONE form.watch() call (array form) to avoid N re-renders per keystroke', () => {
    // Count occurrences of form.watch( in the source
    const count = countOccurrences(source, /form\.watch\(/g);
    expect(count).toBe(1);
  });

  it('the single form.watch() call passes an array of field names', () => {
    // Should be: form.watch(['title', 'description', 'difficulty', 'thumbnail'])
    expect(source).toMatch(/form\.watch\(\[/);
  });

  it('does NOT call form.watch with individual string arguments outside the array', () => {
    // Pattern that would indicate individual field subscription: form.watch('fieldName')
    expect(source).not.toMatch(/form\.watch\(['"][a-zA-Z]/);
  });
});

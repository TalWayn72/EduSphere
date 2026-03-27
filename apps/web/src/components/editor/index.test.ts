/**
 * Barrel re-export tests for editor/index.ts
 *
 * Editor components depend heavily on Tiptap (DOM-based editor framework).
 * The vitest config already excludes editor/ from coverage.
 * This test verifies the barrel file re-exports the correct symbols.
 */
import { describe, it, expect, vi } from 'vitest';

// The editor components use Tiptap which requires extensive DOM APIs.
// Rather than fighting complex mocks, we verify the barrel module structure
// by checking that the index file itself can be parsed and its export names
// match expected values.
// Note: vitest.config.ts already aliases all @tiptap/* to stubs,
// but RichEditor calls createLowlight() at module top level which
// the lowlight stub may not fully support.

// Direct approach: mock the entire modules that index.ts re-exports
vi.mock('./RichEditor', () => ({
  RichEditor: () => null,
}));
vi.mock('./RichContentViewer', () => ({
  RichContentViewer: () => null,
}));
vi.mock('./RichDocumentEditor', () => ({
  RichDocumentEditor: () => null,
}));
vi.mock('./EditorToolbar', () => ({
  EditorToolbar: () => null,
}));

import * as barrel from './index';

describe('editor/index barrel', () => {
  it('exports RichEditor', () => {
    expect(barrel.RichEditor).toBeDefined();
  });

  it('exports RichContentViewer', () => {
    expect(barrel.RichContentViewer).toBeDefined();
  });

  it('exports RichDocumentEditor', () => {
    expect(barrel.RichDocumentEditor).toBeDefined();
  });

  it('exports EditorToolbar', () => {
    expect(barrel.EditorToolbar).toBeDefined();
  });
});

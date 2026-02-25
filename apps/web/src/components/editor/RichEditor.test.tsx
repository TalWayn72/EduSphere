import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// All tiptap packages alias to tiptapStub — use @hocuspocus/provider as the single
// intercept point (same pattern as CollaborativeEditor.test.tsx).
// This mock covers ALL named exports needed across the aliased modules.

const mockChain = {
  focus: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleStrike: vi.fn().mockReturnThis(),
  toggleCodeBlock: vi.fn().mockReturnThis(),
  toggleTaskList: vi.fn().mockReturnThis(),
  insertTable: vi.fn().mockReturnThis(),
  insertContent: vi.fn().mockReturnThis(),
  run: vi.fn(),
};
const mockEditor = { isActive: vi.fn(() => false), chain: vi.fn(() => mockChain) };

vi.mock('@hocuspocus/provider', () => ({
  // @tiptap/react exports
  useEditor: vi.fn(),
  EditorContent: () => <div data-testid="editor-content" />,
  // lowlight exports
  createLowlight: vi.fn(() => ({})),
  lowlight: {},
  // Extension default exports
  default: { configure: vi.fn(() => ({})) },
  // @tiptap/extension-table
  Table: { configure: vi.fn(() => ({})) },
  // @tiptap/extension-image
  Image: {},
  // @tiptap/extension-mathematics
  Mathematics: {},
  // @hocuspocus/provider
  HocuspocusProvider: class {},
}));

import { RichEditor } from './RichEditor';
import * as TiptapReact from '@tiptap/react';

function renderEditor(props: Partial<React.ComponentProps<typeof RichEditor>> = {}) { return render(<RichEditor content="" onChange={vi.fn()} {...props} />); }

describe('RichEditor', () => {
  beforeEach(() => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof TiptapReact.useEditor>);
    mockChain.focus.mockReturnThis();
    mockEditor.isActive.mockReturnValue(false);
  });

  it('renders editor content area', () => { renderEditor(); expect(screen.getByTestId('editor-content')).toBeInTheDocument(); });
  it('returns null when editor not initialised', () => { vi.mocked(TiptapReact.useEditor).mockReturnValue(null as unknown as ReturnType<typeof TiptapReact.useEditor>); const { container } = renderEditor(); expect(container.firstChild).toBeNull(); });
  it('no toolbar in readOnly mode', () => { renderEditor({ readOnly: true }); expect(screen.queryByRole('button', { name: /bold/i })).not.toBeInTheDocument(); });
  it('renders Bold button', () => { renderEditor(); expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument(); });
  it('renders Italic button', () => { renderEditor(); expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument(); });
  it('renders Strikethrough button', () => { renderEditor(); expect(screen.getByRole('button', { name: /strikethrough/i })).toBeInTheDocument(); });
  it('renders Code block button', () => { renderEditor(); expect(screen.getByRole('button', { name: /code block/i })).toBeInTheDocument(); });
  it('renders Insert table button', () => { renderEditor(); expect(screen.getByRole('button', { name: /insert table/i })).toBeInTheDocument(); });
  it('renders Insert math button', () => { renderEditor(); expect(screen.getByRole('button', { name: /insert math/i })).toBeInTheDocument(); });
  it('Upload image button when provided', () => { renderEditor({ onImageUpload: vi.fn() }); expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument(); });
  it('no Upload image button without handler', () => { renderEditor(); expect(screen.queryByRole('button', { name: /upload image/i })).not.toBeInTheDocument(); });
  it('Bold click calls toggleBold', () => { renderEditor(); fireEvent.click(screen.getByRole('button', { name: /bold/i })); expect(mockChain.toggleBold).toHaveBeenCalled(); expect(mockChain.run).toHaveBeenCalled(); });
  it('Code block click calls toggleCodeBlock', () => { renderEditor(); fireEvent.click(screen.getByRole('button', { name: /code block/i })); expect(mockChain.toggleCodeBlock).toHaveBeenCalled(); });
  it('Table click calls insertTable 3x3', () => { renderEditor(); fireEvent.click(screen.getByRole('button', { name: /insert table/i })); expect(mockChain.insertTable).toHaveBeenCalledWith({ rows: 3, cols: 3, withHeaderRow: true }); });
  it('Math click calls insertContent', () => { renderEditor(); fireEvent.click(screen.getByRole('button', { name: /insert math/i })); expect(mockChain.insertContent).toHaveBeenCalled(); });
});

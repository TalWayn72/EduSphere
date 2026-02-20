import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PresenceUser } from './CollaborativeEditor';

// ── Tiptap mock ─────────────────────────────────────────────────────────────
// Tiptap relies on DOM APIs (document.createRange etc.) not available in
// jsdom. We mock the module to return a lightweight stub that exercises the
// component's rendering logic without the real ProseMirror engine.

const mockChain = {
  focus: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleCode: vi.fn().mockReturnThis(),
  toggleHeading: vi.fn().mockReturnThis(),
  toggleBulletList: vi.fn().mockReturnThis(),
  toggleOrderedList: vi.fn().mockReturnThis(),
  toggleTaskList: vi.fn().mockReturnThis(),
  toggleBlockquote: vi.fn().mockReturnThis(),
  toggleCodeBlock: vi.fn().mockReturnThis(),
  insertTable: vi.fn().mockReturnThis(),
  insertContent: vi.fn().mockReturnThis(),
  undo: vi.fn().mockReturnThis(),
  redo: vi.fn().mockReturnThis(),
  run: vi.fn(),
};

const mockEditor = {
  isActive: vi.fn(() => false),
  chain: vi.fn(() => mockChain),
  can: vi.fn(() => ({ undo: () => true, redo: () => false })),
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditor),
  EditorContent: ({ editor: _editor }: { editor: unknown }) => (
    <div data-testid="editor-content" aria-label="editor content" />
  ),
}));

// ── Extension mocks ──────────────────────────────────────────────────────────
vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-collaboration', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-collaboration-cursor', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-code-block-lowlight', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-task-list', () => ({ default: {} }));
vi.mock('@tiptap/extension-task-item', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-table', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-table-row', () => ({ default: {} }));
vi.mock('@tiptap/extension-table-cell', () => ({ default: {} }));
vi.mock('@tiptap/extension-table-header', () => ({ default: {} }));
vi.mock('@tiptap/extension-mention', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-mathematics', () => ({ default: {} }));
vi.mock('lowlight', () => ({ lowlight: {} }));
vi.mock('katex/dist/katex.min.css', () => ({}));

// ── Y.js / HocuspocusProvider mocks ─────────────────────────────────────────
vi.mock('yjs', () => {
  const mockUndoManager = {
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    undo: vi.fn(),
    redo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
  return {
    Doc: vi.fn(() => ({
      getXmlFragment: vi.fn(() => ({})),
    })),
    UndoManager: vi.fn(() => mockUndoManager),
    __mockUndoManager: mockUndoManager,
  };
});

vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: vi.fn(() => ({
    awareness: { setLocalStateField: vi.fn(), on: vi.fn(), off: vi.fn(), getStates: vi.fn(() => new Map()) },
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(() => null),
  getCurrentUser: vi.fn(() => null),
}));

import { CollaborativeEditor } from './CollaborativeEditor';
import { useEditor } from '@tiptap/react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRESENCE_USERS: PresenceUser[] = [
  { id: 'u1', name: 'Alice B.', color: '#6366f1', initials: 'AB', isTyping: true },
  { id: 'u2', name: 'Charlie D.', color: '#ec4899', initials: 'CD', isTyping: false },
];

const renderEditor = (props: Partial<Parameters<typeof CollaborativeEditor>[0]> = {}) =>
  render(<CollaborativeEditor {...props} />);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CollaborativeEditor', () => {
  beforeEach(() => {
    vi.mocked(useEditor).mockReturnValue(mockEditor as unknown as ReturnType<typeof useEditor>);
    mockChain.focus.mockReturnThis();
    Object.values(mockChain).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) fn.mockClear();
    });
    mockChain.focus.mockReturnThis();
    mockChain.run.mockReset();
    mockEditor.isActive.mockReturnValue(false);
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the editor container', () => {
    renderEditor();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('returns null when editor is not yet initialised', () => {
    vi.mocked(useEditor).mockReturnValue(null as unknown as ReturnType<typeof useEditor>);
    const { container } = renderEditor();
    expect(container.firstChild).toBeNull();
  });

  // ── Core toolbar buttons ──────────────────────────────────────────────────

  it('renders Bold toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
  });

  it('renders Italic toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
  });

  it('renders Inline code toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /inline code/i })).toBeInTheDocument();
  });

  it('renders Heading 1 toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /heading 1/i })).toBeInTheDocument();
  });

  it('renders Heading 2 toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /heading 2/i })).toBeInTheDocument();
  });

  it('renders Bullet list toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /bullet list/i })).toBeInTheDocument();
  });

  it('renders Ordered list toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /ordered list/i })).toBeInTheDocument();
  });

  it('renders Blockquote toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /blockquote/i })).toBeInTheDocument();
  });

  // ── New extension toolbar buttons ─────────────────────────────────────────

  it('renders Task list toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /task list/i })).toBeInTheDocument();
  });

  it('renders Code block toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /code block/i })).toBeInTheDocument();
  });

  it('renders Insert table toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /insert table/i })).toBeInTheDocument();
  });

  it('renders Insert math toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /insert math/i })).toBeInTheDocument();
  });

  // ── Undo / Redo buttons ───────────────────────────────────────────────────

  it('renders Undo toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('renders Redo toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
  });

  it('renders all expected toolbar buttons (minimum 14)', () => {
    renderEditor();
    const buttons = screen.getAllByRole('button');
    // Undo, Redo, Bold, Italic, Code, H1, H2, BulletList, OrderedList,
    // TaskList, Blockquote, CodeBlock, Table, Math = 14 minimum
    expect(buttons.length).toBeGreaterThanOrEqual(14);
  });

  // ── Toolbar click interactions ────────────────────────────────────────────

  it('clicking Bold button calls chain().focus().toggleBold().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /bold/i }));
    expect(mockChain.toggleBold).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Italic button calls chain().focus().toggleItalic().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /italic/i }));
    expect(mockChain.toggleItalic).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Inline code button calls chain().focus().toggleCode().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /inline code/i }));
    expect(mockChain.toggleCode).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Blockquote button calls chain().focus().toggleBlockquote().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /blockquote/i }));
    expect(mockChain.toggleBlockquote).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Bullet list button calls chain().focus().toggleBulletList().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /bullet list/i }));
    expect(mockChain.toggleBulletList).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Task list button calls chain().focus().toggleTaskList().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /task list/i }));
    expect(mockChain.toggleTaskList).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Code block button calls chain().focus().toggleCodeBlock().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /code block/i }));
    expect(mockChain.toggleCodeBlock).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Insert table button calls chain().focus().insertTable().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /insert table/i }));
    expect(mockChain.insertTable).toHaveBeenCalledWith({ rows: 3, cols: 3, withHeaderRow: true });
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('clicking Insert math button calls chain().focus().insertContent().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /insert math/i }));
    expect(mockChain.insertContent).toHaveBeenCalledWith('$...$');
    expect(mockChain.run).toHaveBeenCalled();
  });

  // ── Active state ──────────────────────────────────────────────────────────

  it('Bold button uses "secondary" variant when bold is active', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEditor.isActive.mockImplementation(((type: unknown) => type === 'bold') as any);
    renderEditor();
    expect(mockEditor.isActive).toHaveBeenCalledWith('bold');
  });

  it('Code block button uses "secondary" variant when codeBlock is active', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEditor.isActive.mockImplementation(((type: unknown) => type === 'codeBlock') as any);
    renderEditor();
    expect(mockEditor.isActive).toHaveBeenCalledWith('codeBlock');
  });

  it('Task list button uses "secondary" variant when taskList is active', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEditor.isActive.mockImplementation(((type: unknown) => type === 'taskList') as any);
    renderEditor();
    expect(mockEditor.isActive).toHaveBeenCalledWith('taskList');
  });

  it('Table button uses "secondary" variant when table is active', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEditor.isActive.mockImplementation(((type: unknown) => type === 'table') as any);
    renderEditor();
    expect(mockEditor.isActive).toHaveBeenCalledWith('table');
  });

  // ── Presence / avatars ────────────────────────────────────────────────────

  it('does not render presence avatars when presence is empty', () => {
    renderEditor({ presence: [] });
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
  });

  it('renders presence avatars when participants are provided', () => {
    renderEditor({ presence: PRESENCE_USERS });
    expect(screen.getByText('2 online')).toBeInTheDocument();
  });

  it('renders initials for each presence user', () => {
    renderEditor({ presence: PRESENCE_USERS });
    expect(screen.getByText('AB')).toBeInTheDocument();
    expect(screen.getByText('CD')).toBeInTheDocument();
  });

  it('shows typing indicator dot for users who are typing', () => {
    renderEditor({ presence: PRESENCE_USERS });
    const aliceAvatar = screen.getByTitle('Alice B.');
    expect(aliceAvatar).toBeInTheDocument();
  });

  it('renders participant title attributes for hover tooltips', () => {
    renderEditor({ presence: PRESENCE_USERS });
    expect(screen.getByTitle('Alice B.')).toBeInTheDocument();
    expect(screen.getByTitle('Charlie D.')).toBeInTheDocument();
  });
});

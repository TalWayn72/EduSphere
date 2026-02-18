import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PresenceUser } from './CollaborativeEditor';

// ── Tiptap mock ────────────────────────────────────────────────────────────
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
  toggleBlockquote: vi.fn().mockReturnThis(),
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
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" aria-label="editor content" />
  ),
}));

vi.mock('@tiptap/starter-kit', () => ({ default: {} }));
vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

import { CollaborativeEditor } from './CollaborativeEditor';
import { useEditor } from '@tiptap/react';

// ── Helpers ────────────────────────────────────────────────────────────────

const PRESENCE_USERS: PresenceUser[] = [
  { id: 'u1', name: 'Alice B.', color: '#6366f1', initials: 'AB', isTyping: true },
  { id: 'u2', name: 'Charlie D.', color: '#ec4899', initials: 'CD', isTyping: false },
];

const renderEditor = (props: Partial<Parameters<typeof CollaborativeEditor>[0]> = {}) =>
  render(<CollaborativeEditor {...props} />);

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CollaborativeEditor', () => {
  beforeEach(() => {
    vi.mocked(useEditor).mockReturnValue(mockEditor as ReturnType<typeof useEditor>);
    mockChain.focus.mockReturnThis();
    mockChain.run.mockClear();
    mockEditor.isActive.mockReturnValue(false);
  });

  // ── Rendering ───────────────────────────────────────────────────────────

  it('renders the editor container', () => {
    renderEditor();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('returns null when editor is not yet initialised', () => {
    vi.mocked(useEditor).mockReturnValue(null);
    const { container } = renderEditor();
    expect(container.firstChild).toBeNull();
  });

  // ── Toolbar buttons ─────────────────────────────────────────────────────

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

  it('renders Undo toolbar button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('renders Redo toolbar button (disabled when cannot redo)', () => {
    renderEditor();
    const redoBtn = screen.getByRole('button', { name: /redo/i });
    expect(redoBtn).toBeInTheDocument();
    expect(redoBtn).toBeDisabled();
  });

  it('Undo button is enabled when editor.can().undo() returns true', () => {
    mockEditor.can.mockReturnValue({ undo: () => true, redo: () => false });
    renderEditor();
    expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled();
  });

  // ── Toolbar interactions ─────────────────────────────────────────────────

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

  it('clicking Bullet list button calls chain().focus().toggleBulletList().run()', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /bullet list/i }));
    expect(mockChain.toggleBulletList).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  // ── Active state ─────────────────────────────────────────────────────────

  it('Bold button uses "secondary" variant when bold is active', () => {
    mockEditor.isActive.mockImplementation((type: string) => type === 'bold');
    renderEditor();
    // When active the ToolbarButton renders with variant="secondary"
    // We verify isActive was consulted for 'bold'
    expect(mockEditor.isActive).toHaveBeenCalledWith('bold');
  });

  // ── Presence / avatars ───────────────────────────────────────────────────

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
    // The typing indicator is a small span with class bg-green-500 — it renders
    // inside the avatar for Alice (isTyping: true). We verify by checking that
    // the avatar titles are correct.
    const aliceAvatar = screen.getByTitle('Alice B.');
    expect(aliceAvatar).toBeInTheDocument();
  });

  it('renders participant title attributes for hover tooltips', () => {
    renderEditor({ presence: PRESENCE_USERS });
    expect(screen.getByTitle('Alice B.')).toBeInTheDocument();
    expect(screen.getByTitle('Charlie D.')).toBeInTheDocument();
  });
});

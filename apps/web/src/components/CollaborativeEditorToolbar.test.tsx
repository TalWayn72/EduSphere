import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Editor } from '@tiptap/react';
import {
  CollaborativeEditorToolbar,
  ToolbarButton,
} from './CollaborativeEditorToolbar';
import type { PresenceUser } from './CollaborativeEditor';

// ── Mock TipTap Editor ─────────────────────────────────────────────────────

function createMockEditor(activeStates: Record<string, boolean> = {}): Editor {
  const run = vi.fn();
  const chainResult = {
    focus: vi.fn(() => ({
      toggleBold: vi.fn(() => ({ run })),
      toggleItalic: vi.fn(() => ({ run })),
      toggleCode: vi.fn(() => ({ run })),
      toggleHeading: vi.fn(() => ({ run })),
      toggleBulletList: vi.fn(() => ({ run })),
      toggleOrderedList: vi.fn(() => ({ run })),
      toggleTaskList: vi.fn(() => ({ run })),
      toggleBlockquote: vi.fn(() => ({ run })),
      toggleCodeBlock: vi.fn(() => ({ run })),
      insertTable: vi.fn(() => ({ run })),
      insertContent: vi.fn(() => ({ run })),
    })),
  };
  return {
    isActive: vi.fn((type: string, attrs?: object) => {
      const key = attrs ? `${type}:${JSON.stringify(attrs)}` : type;
      return activeStates[key] ?? false;
    }),
    chain: vi.fn(() => chainResult),
  } as unknown as Editor;
}

const defaultUsers: PresenceUser[] = [];

const defaultProps = {
  status: 'connected' as const,
  displayUsers: defaultUsers,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: true,
  canRedo: true,
};

let mockEditor: Editor;

beforeEach(() => {
  vi.clearAllMocks();
  mockEditor = createMockEditor();
});

describe('ToolbarButton', () => {
  it('renders children and title', () => {
    render(
      <ToolbarButton onClick={vi.fn()} title="Bold (Ctrl+B)">
        <span>B</span>
      </ToolbarButton>
    );
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <ToolbarButton onClick={vi.fn()} title="Undo" disabled>
        U
      </ToolbarButton>
    );
    expect(screen.getByTitle('Undo')).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <ToolbarButton onClick={onClick} title="Bold">
        B
      </ToolbarButton>
    );
    fireEvent.click(screen.getByTitle('Bold'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CollaborativeEditorToolbar', () => {
  it('renders Undo and Redo buttons', () => {
    render(
      <CollaborativeEditorToolbar editor={mockEditor} {...defaultProps} />
    );
    expect(screen.getByTitle(/undo/i)).toBeInTheDocument();
    expect(screen.getByTitle(/redo/i)).toBeInTheDocument();
  });

  it('disables Undo when canUndo=false', () => {
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        canUndo={false}
      />
    );
    expect(screen.getByTitle(/undo/i)).toBeDisabled();
  });

  it('disables Redo when canRedo=false', () => {
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        canRedo={false}
      />
    );
    expect(screen.getByTitle(/redo/i)).toBeDisabled();
  });

  it('calls onUndo when Undo button is clicked', () => {
    const onUndo = vi.fn();
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        onUndo={onUndo}
      />
    );
    fireEvent.click(screen.getByTitle(/undo/i));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onRedo when Redo button is clicked', () => {
    const onRedo = vi.fn();
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        onRedo={onRedo}
      />
    );
    fireEvent.click(screen.getByTitle(/redo/i));
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('renders formatting buttons (Bold, Italic, Heading 1, Heading 2)', () => {
    render(
      <CollaborativeEditorToolbar editor={mockEditor} {...defaultProps} />
    );
    expect(screen.getByTitle(/bold/i)).toBeInTheDocument();
    expect(screen.getByTitle(/italic/i)).toBeInTheDocument();
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
  });

  it('shows "Live" status when connected and documentId provided', () => {
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        status="connected"
        documentId="doc-1"
      />
    );
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Connecting" status when status=connecting and documentId provided', () => {
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        status="connecting"
        documentId="doc-1"
      />
    );
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('shows "Offline" status when status=disconnected and documentId provided', () => {
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        status="disconnected"
        documentId="doc-1"
      />
    );
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('does not show status badge when documentId is not provided', () => {
    render(
      <CollaborativeEditorToolbar editor={mockEditor} {...defaultProps} />
    );
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('renders presence avatars with initials and online count', () => {
    const users: PresenceUser[] = [
      {
        id: 'u1',
        name: 'Alice',
        initials: 'AL',
        color: '#f00',
        isTyping: false,
      },
      { id: 'u2', name: 'Bob', initials: 'BO', color: '#0f0', isTyping: true },
    ];
    render(
      <CollaborativeEditorToolbar
        editor={mockEditor}
        {...defaultProps}
        displayUsers={users}
      />
    );
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('BO')).toBeInTheDocument();
    expect(screen.getByText('2 online')).toBeInTheDocument();
  });
});

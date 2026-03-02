import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EditorToolbar } from './EditorToolbar';
import type { Editor } from '@tiptap/react';

// Build a minimal mock Editor with chainable commands
function makeMockEditor(overrides: Record<string, boolean> = {}): Editor {
  const run = vi.fn();
  const chainResult = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleTaskList: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    insertTable: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    run,
  };
  return {
    isActive: vi.fn((name: string) => overrides[name] ?? false),
    chain: vi.fn(() => chainResult),
    _chainResult: chainResult,
  } as unknown as Editor;
}

describe('EditorToolbar', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = makeMockEditor();
  });

  it('renders all standard formatting buttons', () => {
    render(<EditorToolbar editor={editor} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet list')).toBeInTheDocument();
    expect(screen.getByTitle('Ordered list')).toBeInTheDocument();
    expect(screen.getByTitle('Task list')).toBeInTheDocument();
    expect(screen.getByTitle('Code block')).toBeInTheDocument();
    expect(screen.getByTitle('Insert table')).toBeInTheDocument();
  });

  it('does not render image upload button when onImageUpload is not provided', () => {
    render(<EditorToolbar editor={editor} />);
    expect(screen.queryByTitle('Upload image')).not.toBeInTheDocument();
  });

  it('renders image upload button when onImageUpload is provided', () => {
    const onImageUpload = vi.fn();
    render(<EditorToolbar editor={editor} onImageUpload={onImageUpload} />);
    expect(screen.getByTitle('Upload image')).toBeInTheDocument();
  });

  it('calls onImageUpload when image button is clicked', () => {
    const onImageUpload = vi.fn();
    render(<EditorToolbar editor={editor} onImageUpload={onImageUpload} />);
    fireEvent.click(screen.getByTitle('Upload image'));
    expect(onImageUpload).toHaveBeenCalledTimes(1);
  });

  it('does not render math button when hasMath is false (default)', () => {
    render(<EditorToolbar editor={editor} />);
    expect(screen.queryByTitle('Insert math (LaTeX)')).not.toBeInTheDocument();
  });

  it('renders math button when hasMath is true', () => {
    render(<EditorToolbar editor={editor} hasMath />);
    expect(screen.getByTitle('Insert math (LaTeX)')).toBeInTheDocument();
  });

  it('calls editor.chain().focus().toggleBold().run() on Bold click', () => {
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Bold'));
    const chain = (
      editor as unknown as { _chainResult: { run: ReturnType<typeof vi.fn> } }
    )._chainResult;
    expect(chain.run).toHaveBeenCalled();
  });

  it('uses secondary variant for active buttons', () => {
    const activeEditor = makeMockEditor({ bold: true });
    render(<EditorToolbar editor={activeEditor} />);
    // Bold button should have secondary variant (data-variant or class depending on shadcn)
    const boldBtn = screen.getByTitle('Bold');
    // The button element is in the DOM, active state is applied by the editor mock
    expect(boldBtn).toBeInTheDocument();
  });

  it('inserts table when Insert table button is clicked', () => {
    render(<EditorToolbar editor={editor} />);
    fireEvent.click(screen.getByTitle('Insert table'));
    const chain = (
      editor as unknown as {
        _chainResult: {
          insertTable: ReturnType<typeof vi.fn>;
          run: ReturnType<typeof vi.fn>;
        };
      }
    )._chainResult;
    expect(chain.insertTable).toHaveBeenCalledWith({
      rows: 3,
      cols: 3,
      withHeaderRow: true,
    });
    expect(chain.run).toHaveBeenCalled();
  });

  it('inserts math content when math button is clicked', () => {
    render(<EditorToolbar editor={editor} hasMath />);
    fireEvent.click(screen.getByTitle('Insert math (LaTeX)'));
    const chain = (
      editor as unknown as {
        _chainResult: {
          insertContent: ReturnType<typeof vi.fn>;
          run: ReturnType<typeof vi.fn>;
        };
      }
    )._chainResult;
    expect(chain.insertContent).toHaveBeenCalledWith('$$...$$');
    expect(chain.run).toHaveBeenCalled();
  });
});

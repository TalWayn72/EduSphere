import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// All tiptap / lowlight / katex packages alias to tiptap-stub.ts in
// vitest.config.ts — mock @hocuspocus/provider as the single intercept
// point so that ALL aliased packages share this mock's exports.
vi.mock('@hocuspocus/provider', () => ({
  useEditor: vi.fn(() => null),
  EditorContent: ({ editor }: { editor: unknown }) =>
    editor ? <div data-testid="editor-content" /> : null,
  createLowlight: vi.fn(() => ({})),
  lowlight: {},
  default: { configure: vi.fn(() => ({})) },
  Table: { configure: vi.fn(() => ({})) },
  Image: {},
  Mathematics: {},
  HocuspocusProvider: class {},
}));

import { RichContentViewer } from './RichContentViewer';
import * as TiptapReact from '@tiptap/react';

const makeEditor = () =>
  ({
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: vi.fn().mockReturnThis(), run: vi.fn() })),
    state: {},
    view: {},
  }) as unknown as ReturnType<typeof TiptapReact.useEditor>;

describe('RichContentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TiptapReact.useEditor).mockReturnValue(null as never);
  });

  it('returns null when editor is not ready', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(null as never);
    const { container } = render(<RichContentViewer content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders viewer wrapper when editor is ready', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    const { container } = render(
      <RichContentViewer content='{"type":"doc","content":[]}' />
    );
    expect(container.querySelector('.rich-content-viewer')).toBeInTheDocument();
  });

  it('renders EditorContent inside viewer when editor ready', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<RichContentViewer content='{"type":"doc","content":[]}' />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('passes parsed JSON content to useEditor', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    const jsonContent = '{"type":"doc","content":[{"type":"paragraph"}]}';
    render(<RichContentViewer content={jsonContent} />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    expect(call?.content).toEqual(JSON.parse(jsonContent));
  });

  it('converts markdown heading to HTML string for useEditor', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<RichContentViewer content="# Hello World" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    expect(typeof call?.content).toBe('string');
    expect(call?.content as string).toContain('<h1>');
  });

  it('uses empty doc when content is empty string', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<RichContentViewer content="" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    expect(call?.content).toEqual({ type: 'doc', content: [] });
  });

  it('sets editable: false on the editor', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<RichContentViewer content="" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    expect(call?.editable).toBe(false);
  });

  it('applies aria-label and role via editorProps', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<RichContentViewer content="" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    const attrs = call?.editorProps?.attributes as Record<string, string> | undefined;
    expect(attrs?.['aria-label']).toBe('Rich document content');
    expect(attrs?.['role']).toBe('document');
  });

  it('passes onSelectionUpdate callback to useEditor', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    const onSelectionUpdate = vi.fn();
    render(
      <RichContentViewer content="" onSelectionUpdate={onSelectionUpdate} />
    );
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    expect(call?.onSelectionUpdate).toBe(onSelectionUpdate);
  });

  it('handles invalid JSON by converting to markdown/HTML string', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<RichContentViewer content="not valid json {{{" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0];
    expect(typeof call?.content).toBe('string');
  });
});

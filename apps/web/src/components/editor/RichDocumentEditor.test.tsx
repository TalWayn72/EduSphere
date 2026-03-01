import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// urql sync mock
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Mock the RichEditor sub-component — avoids the full tiptap stack
vi.mock('@/components/editor/RichEditor', () => ({
  RichEditor: ({
    onChange,
    content,
  }: {
    onChange: (v: string) => void;
    content: string;
  }) => (
    <div
      data-testid="rich-editor"
      data-content={content}
      onClick={() => onChange('{"type":"doc","content":[]}') }
    />
  ),
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  CREATE_CONTENT_ITEM_MUTATION: 'mutation CreateContentItem',
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  PRESIGNED_UPLOAD_QUERY: 'query PresignedUpload',
}));

vi.mock('@/lib/urql-client', () => ({
  urqlClient: { query: vi.fn() },
}));

import { RichDocumentEditor } from './RichDocumentEditor';
import * as urql from 'urql';
import { toast } from 'sonner';

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

function renderEditor(props: Partial<React.ComponentProps<typeof RichDocumentEditor>> = {}) {
  return render(
    <RichDocumentEditor moduleId="module-1" courseId="course-1" {...props} />
  );
}

describe('RichDocumentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, data: undefined, error: undefined, stale: false, operation: undefined },
      NOOP_EXECUTE,
    ] as unknown as ReturnType<typeof urql.useMutation>);
  });

  it('renders Document Title label and input', () => {
    renderEditor();
    expect(screen.getByLabelText(/document title/i)).toBeInTheDocument();
  });

  it('renders the RichEditor component', () => {
    renderEditor();
    expect(screen.getByTestId('rich-editor')).toBeInTheDocument();
  });

  it('renders Save Document button', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /save document/i })).toBeInTheDocument();
  });

  it('Save button is disabled when title is empty', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /save document/i })).toBeDisabled();
  });

  it('Save button becomes enabled after title is entered', () => {
    renderEditor();
    const input = screen.getByPlaceholderText(/enter document title/i);
    fireEvent.change(input, { target: { value: 'My Doc' } });
    expect(screen.getByRole('button', { name: /save document/i })).not.toBeDisabled();
  });

  it('Save button is disabled (and does not fire) when title is whitespace only', () => {
    renderEditor();
    const input = screen.getByPlaceholderText(/enter document title/i);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /save document/i })).toBeDisabled();
  });

  it('calls executeCreate mutation with correct payload on save', async () => {
    const executeCreate = vi.fn().mockResolvedValue({
      data: { createContentItem: { id: 'item-1', title: 'Test Doc' } },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, data: undefined, error: undefined, stale: false, operation: undefined },
      executeCreate,
    ] as unknown as ReturnType<typeof urql.useMutation>);

    renderEditor();
    fireEvent.change(screen.getByPlaceholderText(/enter document title/i), {
      target: { value: 'Test Doc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save document/i }));

    await waitFor(() => {
      expect(executeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            moduleId: 'module-1',
            title: 'Test Doc',
            type: 'RICH_DOCUMENT',
            orderIndex: 0,
          }),
        })
      );
    });
  });

  it('calls onSaved callback with contentItemId on success', async () => {
    const onSaved = vi.fn();
    const executeCreate = vi.fn().mockResolvedValue({
      data: { createContentItem: { id: 'item-99', title: 'Saved Doc' } },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, data: undefined, error: undefined, stale: false, operation: undefined },
      executeCreate,
    ] as unknown as ReturnType<typeof urql.useMutation>);

    renderEditor({ onSaved });
    fireEvent.change(screen.getByPlaceholderText(/enter document title/i), {
      target: { value: 'Saved Doc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save document/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith('item-99');
    });
  });

  it('shows toast error when mutation returns graphql error', async () => {
    const executeCreate = vi.fn().mockResolvedValue({
      data: undefined,
      error: {
        message: 'Server error',
        graphQLErrors: [{ message: 'Forbidden' }],
      },
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, data: undefined, error: undefined, stale: false, operation: undefined },
      executeCreate,
    ] as unknown as ReturnType<typeof urql.useMutation>);

    renderEditor();
    fireEvent.change(screen.getByPlaceholderText(/enter document title/i), {
      target: { value: 'My Doc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save document/i }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Forbidden');
    });
  });
});

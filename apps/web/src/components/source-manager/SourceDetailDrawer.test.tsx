/**
 * SourceDetailDrawer component tests — tests the REAL component.
 *
 * Validates:
 *  1. Loading state renders
 *  2. Source content renders after load
 *  3. Error state renders
 *  4. PDF source type shows rawContent (plaintext fallback)
 *  5. Non-PDF source shows rawContent
 *  6. Source without rawContent shows noContent fallback
 *  7. Back button fires onClose
 *  8. Chunk footer info
 *  9. Title placeholder while loading
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('@/lib/graphql', () => ({
  gqlClient: { request: vi.fn() },
}));

vi.mock('@/lib/graphql/sources.queries', () => ({
  KNOWLEDGE_SOURCE_DETAIL: 'KNOWLEDGE_SOURCE_DETAIL',
}));

vi.mock('./utils', () => ({
  IS_DEV_MODE: true,
  authHeaders: () => ({}),
  hasValidAuth: () => true,
  getSourceErrorKey: () => 'sources.error',
}));

vi.mock('./dev-mock', () => ({
  getDevSources: () => [
    {
      id: 's1',
      title: 'Test Source',
      rawContent: 'This is the raw content of the source.',
      sourceType: 'FILE_TXT',
      chunkCount: 3,
      createdAt: '2026-01-15T10:00:00Z',
    },
  ],
}));

vi.mock('@/components/pdf', () => ({
  PdfDocumentViewer: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'ltr', language: 'en' },
  }),
}));

import { SourceDetailDrawer } from './SourceDetailDrawer';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SourceDetailDrawer', () => {
  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('sources.loading');
  });

  it('renders source content after load', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Test Source',
        rawContent: 'This is the raw content of the source.',
        sourceType: 'FILE_TXT',
        chunkCount: 3,
        createdAt: '2026-01-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(screen.getByText('This is the raw content of the source.')).toBeInTheDocument();
    expect(screen.getByText('Test Source')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(screen.getByText('sources.error')).toBeInTheDocument();
  });

  it('PDF source type shows rawContent as plaintext fallback', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's2',
        title: 'PDF Source',
        rawContent: 'Extracted text from PDF document.',
        sourceType: 'FILE_PDF',
        chunkCount: 5,
        createdAt: '2026-02-20T14:30:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s2" onClose={vi.fn()} />);
    expect(screen.getByText('Extracted text from PDF document.')).toBeInTheDocument();
    expect(screen.getByText('PDF Source')).toBeInTheDocument();
  });

  it('non-PDF source shows rawContent as plaintext', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Text Source',
        rawContent: 'Plain text content here.',
        sourceType: 'FILE_TXT',
        chunkCount: 2,
        createdAt: '2026-01-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(screen.getByText('Plain text content here.')).toBeInTheDocument();
  });

  it('source without rawContent shows noContent fallback', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's3',
        title: 'Empty Source',
        rawContent: null,
        sourceType: 'URL',
        chunkCount: 0,
        createdAt: '2026-03-01T09:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s3" onClose={vi.fn()} />);
    expect(screen.getByText('sources.noContent')).toBeInTheDocument();
  });

  it('back button fires onClose callback', () => {
    const onClose = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Test Source',
        rawContent: 'Content',
        sourceType: 'FILE_TXT',
        chunkCount: 1,
        createdAt: '2026-01-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={onClose} />);
    fireEvent.click(screen.getByText('sources.back'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows chunk footer info', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Test Source',
        rawContent: 'Content',
        sourceType: 'FILE_TXT',
        chunkCount: 7,
        createdAt: '2026-06-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('sources.chunkFooter');
  });

  it('shows title placeholder while loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});

describe('SourceDetailDrawer — Accessibility', () => {
  it('drawer has role="dialog" with aria-label', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Test Source',
        rawContent: 'Content',
        sourceType: 'FILE_TXT',
        chunkCount: 1,
        createdAt: '2026-01-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Test Source');
  });

  it('back button has descriptive aria-label', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Test Source',
        rawContent: 'Content',
        sourceType: 'FILE_TXT',
        chunkCount: 1,
        createdAt: '2026-01-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(screen.getByLabelText('sources.backLabel')).toBeInTheDocument();
  });

  it('title has aria-live="polite" for screen reader announcement', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 's1',
        title: 'Test Source',
        rawContent: 'Content',
        sourceType: 'FILE_TXT',
        chunkCount: 1,
        createdAt: '2026-01-15T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    const title = screen.getByText('Test Source');
    expect(title).toHaveAttribute('aria-live', 'polite');
  });

  it('error state uses role="alert"', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('dialog uses loading title as aria-label when data is loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<SourceDetailDrawer sourceId="s1" onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'sources.loading');
  });
});

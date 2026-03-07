/**
 * DocumentVersionPanel — unit tests.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── urql mock ────────────────────────────────────────────────────────────────
const mockUseQuery = vi.fn();
const mockCreateVersion = vi.fn().mockResolvedValue({ data: {} });
const mockRollback = vi.fn().mockResolvedValue({ data: {} });

vi.mock('urql', () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn((doc: unknown) => {
    const docStr = String(doc);
    if (docStr.includes('CreateDocumentVersion')) return [{}, mockCreateVersion];
    if (docStr.includes('RollbackToVersion')) return [{}, mockRollback];
    return [{}, vi.fn()];
  }),
  gql: (s: TemplateStringsArray, ...vals: unknown[]) =>
    s.reduce((acc, str, i) => acc + str + (vals[i] ?? ''), ''),
}));

// ── shadcn mocks ─────────────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} data-testid={testId}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

const VERSIONS = [
  {
    id: 'v1',
    versionNumber: 1,
    anchorCount: 5,
    brokenAnchorCount: 0,
    diffSummary: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'v2',
    versionNumber: 2,
    anchorCount: 8,
    brokenAnchorCount: 2,
    diffSummary: 'Added 3 anchors',
    createdAt: '2026-01-02T00:00:00Z',
  },
];

describe('DocumentVersionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders loading state', async () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: true }]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no versions', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: [] }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    expect(screen.getByText('No versions yet')).toBeInTheDocument();
  });

  it('renders version list with correct version numbers', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: VERSIONS }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('shows anchor counts', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: VERSIONS }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    expect(screen.getByText(/5 anchors/)).toBeInTheDocument();
    expect(screen.getByText(/8 anchors/)).toBeInTheDocument();
  });

  it('shows broken badge when brokenAnchorCount > 0', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: VERSIONS }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('2 broken');
  });

  it('does NOT show broken badge when brokenAnchorCount is 0', async () => {
    mockUseQuery.mockReturnValue([
      {
        data: {
          getDocumentVersions: [VERSIONS[0]], // no broken anchors
        },
        fetching: false,
      },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });

  it('Snapshot Now button calls createVersion mutation', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: VERSIONS }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-99" />);

    fireEvent.click(screen.getByText('Snapshot Now'));

    await waitFor(() =>
      expect(mockCreateVersion).toHaveBeenCalledWith({
        mediaAssetId: 'media-99',
        summary: 'Manual snapshot',
      })
    );
  });

  it('Restore button calls rollback mutation after confirm', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: VERSIONS }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() =>
      expect(mockRollback).toHaveBeenCalledWith({ versionId: 'v1' })
    );
  });

  it('Restore button does NOT call rollback when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: VERSIONS }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    fireEvent.click(screen.getAllByText('Restore')[0]);

    await waitFor(() => expect(mockRollback).not.toHaveBeenCalled());
  });

  it('renders data-testid="document-version-panel"', async () => {
    mockUseQuery.mockReturnValue([
      { data: { getDocumentVersions: [] }, fetching: false },
    ]);
    const { default: DocumentVersionPanel } = await import(
      './DocumentVersionPanel'
    );
    render(<DocumentVersionPanel mediaAssetId="media-1" />);

    expect(screen.getByTestId('document-version-panel')).toBeInTheDocument();
  });
});

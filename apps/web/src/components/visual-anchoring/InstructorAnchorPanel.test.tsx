/**
 * InstructorAnchorPanel unit tests
 *
 * Covers:
 *  1. Renders list of anchors sorted by documentOrder
 *  2. Shows "Broken" badge for isBroken=true anchors
 *  3. Delete button calls deleteMutation
 *  4. "Preview as Student" button calls onPreviewAsStudent
 *  5. Empty state rendered when anchors array is empty
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { VisualAnchor } from './visual-anchor.types';

// ── urql mock ──────────────────────────────────────────────────────────────────
const mockDeleteAnchor = vi.fn().mockResolvedValue({ data: { deleteVisualAnchor: true }, error: undefined });

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, mockDeleteAnchor]),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
}));

// ── shadcn/ui mocks ────────────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'data-testid': testId,
    'aria-label': ariaLabel,
  }: React.HTMLAttributes<HTMLButtonElement> & {
    onClick?: () => void;
    'data-testid'?: string;
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} data-testid={testId} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, 'data-testid': testId }: React.HTMLAttributes<HTMLSpanElement> & { 'data-testid'?: string }) => (
    <span data-testid={testId}>{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="icon-trash" />,
  Eye: () => <span data-testid="icon-eye" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: string[]) => args.filter(Boolean).join(' ') }));

vi.mock('./visual-anchor.graphql', () => ({
  DELETE_VISUAL_ANCHOR: 'DELETE_VISUAL_ANCHOR',
}));

import InstructorAnchorPanel from './InstructorAnchorPanel';

// ── fixtures ───────────────────────────────────────────────────────────────────

const ANCHORS: VisualAnchor[] = [
  {
    id: 'a-2',
    mediaAssetId: 'media-1',
    anchorText: 'Second anchor text',
    documentOrder: 1,
    isBroken: false,
    visualAssetId: null,
    visualAsset: null,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'a-1',
    mediaAssetId: 'media-1',
    anchorText: 'First anchor text',
    documentOrder: 0,
    isBroken: false,
    visualAssetId: null,
    visualAsset: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a-3',
    mediaAssetId: 'media-1',
    anchorText: 'Broken anchor text',
    documentOrder: 2,
    isBroken: true,
    visualAssetId: null,
    visualAsset: null,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
  },
];

function renderPanel(anchors = ANCHORS) {
  const onAnchorDeleted = vi.fn();
  const onPreviewAsStudent = vi.fn();
  const utils = render(
    <InstructorAnchorPanel
      anchors={anchors}
      courseId="course-1"
      onAnchorDeleted={onAnchorDeleted}
      onPreviewAsStudent={onPreviewAsStudent}
    />,
  );
  return { ...utils, onAnchorDeleted, onPreviewAsStudent };
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe('InstructorAnchorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel with correct anchor count in heading', () => {
    renderPanel();
    expect(screen.getByText('Visual Anchors (3)')).toBeInTheDocument();
  });

  it('renders anchors sorted by documentOrder (a-1 first, a-3 last)', () => {
    renderPanel();
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveAttribute('data-testid', 'anchor-row-a-1');
    expect(rows[1]).toHaveAttribute('data-testid', 'anchor-row-a-2');
    expect(rows[2]).toHaveAttribute('data-testid', 'anchor-row-a-3');
  });

  it('shows anchor text in each row', () => {
    renderPanel();
    expect(screen.getByText('First anchor text')).toBeInTheDocument();
    expect(screen.getByText('Second anchor text')).toBeInTheDocument();
    expect(screen.getByText('Broken anchor text')).toBeInTheDocument();
  });

  it('shows "Broken" badge only for isBroken=true anchor', () => {
    renderPanel();
    expect(screen.getByTestId('broken-badge-a-3')).toBeInTheDocument();
    expect(screen.queryByTestId('broken-badge-a-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('broken-badge-a-2')).not.toBeInTheDocument();
  });

  it('calls deleteAnchor mutation and onAnchorDeleted when delete button clicked', async () => {
    const { onAnchorDeleted } = renderPanel();

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-anchor-btn-a-1'));
    });

    await waitFor(() => {
      expect(mockDeleteAnchor).toHaveBeenCalledWith({ id: 'a-1' });
    });

    expect(onAnchorDeleted).toHaveBeenCalledWith('a-1');
  });

  it('does NOT call onAnchorDeleted when mutation returns an error', async () => {
    mockDeleteAnchor.mockResolvedValueOnce({ data: undefined, error: new Error('Network error') });
    const { onAnchorDeleted } = renderPanel();

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-anchor-btn-a-1'));
    });

    await waitFor(() => {
      expect(mockDeleteAnchor).toHaveBeenCalledTimes(1);
    });

    expect(onAnchorDeleted).not.toHaveBeenCalled();
  });

  it('calls onPreviewAsStudent when "Preview as Student" button is clicked', () => {
    const { onPreviewAsStudent } = renderPanel();
    fireEvent.click(screen.getByTestId('preview-as-student-btn'));
    expect(onPreviewAsStudent).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when anchors array is empty', () => {
    renderPanel([]);
    expect(screen.getByTestId('anchor-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No anchors yet/)).toBeInTheDocument();
    expect(screen.getByText(/Select text in the document/)).toBeInTheDocument();
  });

  it('shows "(0)" in heading when no anchors', () => {
    renderPanel([]);
    expect(screen.getByText('Visual Anchors (0)')).toBeInTheDocument();
  });

  it('truncates anchor text longer than 50 characters', () => {
    const longAnchor: VisualAnchor = {
      id: 'a-long',
      mediaAssetId: 'media-1',
      anchorText: 'A'.repeat(60),
      documentOrder: 0,
      isBroken: false,
      visualAssetId: null,
      visualAsset: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    renderPanel([longAnchor]);
    const truncated = `${'A'.repeat(50)}…`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });
});

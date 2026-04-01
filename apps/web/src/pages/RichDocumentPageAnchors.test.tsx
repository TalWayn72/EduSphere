import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('@/components/visual-anchoring/VisualSidebar', () => ({
  default: ({ anchors }: { anchors: unknown[] }) => (
    <div data-testid="visual-sidebar" data-count={anchors.length} />
  ),
}));

vi.mock('@/components/visual-anchoring/AnchorFrame', () => ({
  default: () => <div data-testid="anchor-frame" />,
}));

vi.mock('@/components/visual-anchoring/InstructorAnchorPanel', () => ({
  default: ({ anchors }: { anchors: unknown[] }) => (
    <div data-testid="instructor-panel" data-count={anchors.length} />
  ),
}));

vi.mock('@/hooks/useAnchorDetection', () => ({
  useAnchorDetection: () => ({ activeAnchorId: null }),
}));

vi.mock('@/components/visual-anchoring/visual-anchor.graphql', () => ({
  GET_VISUAL_ANCHORS: 'GET_VISUAL_ANCHORS',
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { RichDocumentPageAnchors } from './RichDocumentPageAnchors';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_QUERY = [
  { data: undefined, fetching: false, error: undefined },
] as never;
const ANCHORS_QUERY = [
  {
    data: {
      getVisualAnchors: [
        { id: 'a1', documentOrder: 0, visualAsset: null },
        { id: 'a2', documentOrder: 1, visualAsset: null },
      ],
    },
    fetching: false,
    error: undefined,
  },
] as never;

function createScrollRef() {
  return { current: document.createElement('div') };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RichDocumentPageAnchors', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders VisualSidebar for student (isInstructor=false)', () => {
    vi.mocked(urql.useQuery).mockReturnValue(ANCHORS_QUERY);
    render(
      <RichDocumentPageAnchors
        assetId="asset-1"
        isInstructor={false}
        scrollContainerRef={createScrollRef()}
      >
        <div>Document content</div>
      </RichDocumentPageAnchors>
    );
    expect(screen.getByTestId('visual-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-panel')).not.toBeInTheDocument();
  });

  it('renders InstructorAnchorPanel for instructor', () => {
    vi.mocked(urql.useQuery).mockReturnValue(ANCHORS_QUERY);
    render(
      <RichDocumentPageAnchors
        assetId="asset-1"
        isInstructor={true}
        scrollContainerRef={createScrollRef()}
      >
        <div>Document content</div>
      </RichDocumentPageAnchors>
    );
    expect(screen.getByTestId('instructor-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('visual-sidebar')).not.toBeInTheDocument();
  });

  it('passes children through', () => {
    vi.mocked(urql.useQuery).mockReturnValue(EMPTY_QUERY);
    render(
      <RichDocumentPageAnchors
        assetId="asset-1"
        isInstructor={false}
        scrollContainerRef={createScrollRef()}
      >
        <div data-testid="child-content">Hello World</div>
      </RichDocumentPageAnchors>
    );
    expect(screen.getByTestId('child-content')).toHaveTextContent(
      'Hello World'
    );
  });

  it('renders AnchorFrame overlay', () => {
    vi.mocked(urql.useQuery).mockReturnValue(EMPTY_QUERY);
    render(
      <RichDocumentPageAnchors
        assetId="asset-1"
        isInstructor={false}
        scrollContainerRef={createScrollRef()}
      >
        <div>Content</div>
      </RichDocumentPageAnchors>
    );
    expect(screen.getByTestId('anchor-frame')).toBeInTheDocument();
  });

  it('pauses query when assetId is empty', () => {
    vi.mocked(urql.useQuery).mockReturnValue(EMPTY_QUERY);
    render(
      <RichDocumentPageAnchors
        assetId=""
        isInstructor={false}
        scrollContainerRef={createScrollRef()}
      >
        <div>Content</div>
      </RichDocumentPageAnchors>
    );
    expect(urql.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ pause: true })
    );
  });
});

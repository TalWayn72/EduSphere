/**
 * VideoAnnotationLayer unit tests
 *
 * Covers:
 *  1. Renders without crashing
 *  2. Renders annotation markers for each annotation
 *  3. Calls onAnnotationClick when a marker is clicked
 *  4. Add annotation button is present
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { VideoAnnotation } from '@/hooks/useVideoAnnotations';
import { AnnotationLayer } from '@/types/annotations';

// ── Mock useVideoAnnotations ──────────────────────────────────────────────────

const mockAddAnnotation = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useVideoAnnotations', () => ({
  useVideoAnnotations: vi.fn(),
}));

// ── Mock AnnotationTimeline (tested separately) ───────────────────────────────

vi.mock('../AnnotationTimeline', () => ({
  AnnotationTimeline: () => <div data-testid="annotation-timeline" />,
}));

// ── Mock shadcn/ui Tooltip (not needed for these unit tests) ──────────────────

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? <>{children}</> : <div>{children}</div>),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { VideoAnnotationLayer } from '../VideoAnnotationLayer';
import * as videoAnnotationsModule from '@/hooks/useVideoAnnotations';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SAMPLE_ANNOTATIONS: VideoAnnotation[] = [
  {
    id: 'ann-1',
    assetId: 'video-abc',
    userId: 'user-1',
    layer: AnnotationLayer.PERSONAL,
    text: 'First annotation',
    timestamp: 10,
    color: '#7c3aed',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ann-2',
    assetId: 'video-abc',
    userId: 'user-2',
    layer: AnnotationLayer.SHARED,
    text: 'Second annotation',
    timestamp: 30,
    color: '#2563eb',
    createdAt: '2026-01-01T00:01:00Z',
    updatedAt: '2026-01-01T00:01:00Z',
  },
];

function setupMock(annotations: VideoAnnotation[] = SAMPLE_ANNOTATIONS) {
  vi.mocked(videoAnnotationsModule.useVideoAnnotations).mockReturnValue({
    annotations,
    isLoading: false,
    error: null,
    addAnnotation: mockAddAnnotation,
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  });
}

const DEFAULT_PROPS = {
  videoId: 'video-abc',
  tenantId: 'tenant-1',
  currentTime: 15,
  duration: 120,
  onAnnotationClick: vi.fn(),
  onSeek: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VideoAnnotationLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders without crashing', () => {
    const { container } = render(<VideoAnnotationLayer {...DEFAULT_PROPS} />);
    expect(container).toBeTruthy();
  });

  it('renders an annotation marker for each annotation', () => {
    render(<VideoAnnotationLayer {...DEFAULT_PROPS} />);
    const markers = screen.getAllByRole('listitem');
    expect(markers).toHaveLength(SAMPLE_ANNOTATIONS.length);
  });

  it('calls onAnnotationClick with the correct annotation when marker is clicked', () => {
    const onAnnotationClick = vi.fn();
    render(
      <VideoAnnotationLayer
        {...DEFAULT_PROPS}
        onAnnotationClick={onAnnotationClick}
      />
    );

    const markers = screen.getAllByRole('listitem');
    fireEvent.click(markers[0]!);
    expect(onAnnotationClick).toHaveBeenCalledTimes(1);
    expect(onAnnotationClick).toHaveBeenCalledWith(SAMPLE_ANNOTATIONS[0]);
  });

  it('shows the Add Note button', () => {
    render(<VideoAnnotationLayer {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /add note/i })).toBeTruthy();
  });

  it('renders nothing when duration is 0', () => {
    render(<VideoAnnotationLayer {...DEFAULT_PROPS} duration={0} />);
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByLabelText(/annotation layer/i)).toBeNull();
  });
});

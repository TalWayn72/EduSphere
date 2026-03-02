/**
 * VideoAnnotationLayer — unit tests
 * Mocks useVideoAnnotations (which uses urql) and child components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoAnnotationLayer } from './VideoAnnotationLayer';
import { AnnotationLayer } from '@/types/annotations';
import type { VideoAnnotation } from '@/hooks/useVideoAnnotations';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAddAnnotation = vi.fn().mockResolvedValue(undefined);

const mockUseVideoAnnotations = vi.fn();

vi.mock('@/hooks/useVideoAnnotations', () => ({
  useVideoAnnotations: (...args: unknown[]) => mockUseVideoAnnotations(...args),
}));

vi.mock('./AnnotationTimeline', () => ({
  AnnotationTimeline: ({
    annotations,
    onSeek,
  }: {
    annotations: VideoAnnotation[];
    onSeek: (t: number) => void;
  }) => (
    <div data-testid="annotation-timeline" data-count={annotations.length}>
      <button onClick={() => onSeek(42)}>seek</button>
    </div>
  ),
}));

vi.mock('./AddAnnotationForm', () => ({
  AddAnnotationForm: ({
    currentTime,
    onSave,
    onCancel,
  }: {
    currentTime: number;
    onSave: (t: string, ts: number) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="add-annotation-form" data-time={currentTime}>
      <button onClick={() => onSave('my note', currentTime)}>save</button>
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}));

// Tooltip stubs
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeAnnotation = (id: string, timestamp: number): VideoAnnotation => ({
  id,
  assetId: 'asset-1',
  userId: 'user-1',
  layer: AnnotationLayer.PERSONAL,
  text: `Note ${id}`,
  timestamp,
  color: '#7c3aed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const defaultProps = {
  videoId: 'video-1',
  tenantId: 'tenant-1',
  currentTime: 30,
  duration: 120,
  onAnnotationClick: vi.fn(),
  onSeek: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseVideoAnnotations.mockReturnValue({
    annotations: [],
    isLoading: false,
    error: null,
    addAnnotation: mockAddAnnotation,
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VideoAnnotationLayer', () => {
  it('returns null when duration is 0', () => {
    const { container } = render(
      <VideoAnnotationLayer {...defaultProps} duration={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the annotation layer container', () => {
    render(<VideoAnnotationLayer {...defaultProps} />);
    expect(screen.getByLabelText('Video annotation layer')).toBeInTheDocument();
  });

  it('renders AnnotationTimeline with annotations', () => {
    mockUseVideoAnnotations.mockReturnValue({
      annotations: [makeAnnotation('a1', 30), makeAnnotation('a2', 60)],
      isLoading: false,
      error: null,
      addAnnotation: mockAddAnnotation,
      updateAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    });
    render(<VideoAnnotationLayer {...defaultProps} />);
    expect(screen.getByTestId('annotation-timeline')).toHaveAttribute(
      'data-count',
      '2'
    );
  });

  it('shows loading text while isLoading is true', () => {
    mockUseVideoAnnotations.mockReturnValue({
      annotations: [],
      isLoading: true,
      error: null,
      addAnnotation: mockAddAnnotation,
      updateAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    });
    render(<VideoAnnotationLayer {...defaultProps} />);
    expect(screen.getByText(/loading annotations/i)).toBeInTheDocument();
  });

  it('shows "Add Note" button by default', () => {
    render(<VideoAnnotationLayer {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /add note at current time/i })
    ).toBeInTheDocument();
  });

  it('shows AddAnnotationForm after clicking Add Note button', () => {
    render(<VideoAnnotationLayer {...defaultProps} />);
    fireEvent.click(
      screen.getByRole('button', { name: /add note at current time/i })
    );
    expect(screen.getByTestId('add-annotation-form')).toBeInTheDocument();
  });

  it('hides form and calls addAnnotation on save', async () => {
    render(<VideoAnnotationLayer {...defaultProps} currentTime={45} />);
    fireEvent.click(
      screen.getByRole('button', { name: /add note at current time/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => {
      expect(mockAddAnnotation).toHaveBeenCalledWith('my note', 45);
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId('add-annotation-form')
      ).not.toBeInTheDocument();
    });
  });

  it('hides form on cancel without calling addAnnotation', () => {
    render(<VideoAnnotationLayer {...defaultProps} />);
    fireEvent.click(
      screen.getByRole('button', { name: /add note at current time/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByTestId('add-annotation-form')).not.toBeInTheDocument();
    expect(mockAddAnnotation).not.toHaveBeenCalled();
  });

  it('renders annotation marker buttons for each annotation', () => {
    mockUseVideoAnnotations.mockReturnValue({
      annotations: [makeAnnotation('a1', 30), makeAnnotation('a2', 60)],
      isLoading: false,
      error: null,
      addAnnotation: mockAddAnnotation,
      updateAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    });
    render(<VideoAnnotationLayer {...defaultProps} />);
    const markers = screen.getAllByRole('listitem');
    expect(markers).toHaveLength(2);
  });

  it('calls onAnnotationClick when an annotation marker is clicked', () => {
    const onAnnotationClick = vi.fn();
    const ann = makeAnnotation('a1', 30);
    mockUseVideoAnnotations.mockReturnValue({
      annotations: [ann],
      isLoading: false,
      error: null,
      addAnnotation: mockAddAnnotation,
      updateAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    });
    render(
      <VideoAnnotationLayer
        {...defaultProps}
        onAnnotationClick={onAnnotationClick}
      />
    );
    fireEvent.click(screen.getByRole('listitem'));
    expect(onAnnotationClick).toHaveBeenCalledWith(ann);
  });
});

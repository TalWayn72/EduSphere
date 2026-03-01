/**
 * AnnotationTimeline — unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationTimeline } from './AnnotationTimeline';
import { AnnotationLayer } from '@/types/annotations';
import type { VideoAnnotation } from '@/hooks/useVideoAnnotations';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeAnnotation = (
  id: string,
  timestamp: number,
  text = 'Test note'
): VideoAnnotation => ({
  id,
  assetId: 'asset-1',
  userId: 'user-1',
  layer: AnnotationLayer.PERSONAL,
  text,
  timestamp,
  color: '#7c3aed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const defaultProps = {
  annotations: [],
  currentTime: 30,
  duration: 120,
  onSeek: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnotationTimeline', () => {
  it('returns null when duration is 0', () => {
    const { container } = render(
      <AnnotationTimeline {...defaultProps} duration={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when duration is negative', () => {
    const { container } = render(
      <AnnotationTimeline {...defaultProps} duration={-10} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the timeline container with aria-label', () => {
    render(<AnnotationTimeline {...defaultProps} />);
    expect(screen.getByLabelText('Annotation timeline')).toBeInTheDocument();
  });

  it('renders slider with correct aria attributes', () => {
    render(
      <AnnotationTimeline
        {...defaultProps}
        currentTime={30}
        duration={120}
      />
    );
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '120');
    expect(slider).toHaveAttribute('aria-valuenow', '30');
  });

  it('displays current time and duration as formatted labels', () => {
    render(
      <AnnotationTimeline
        {...defaultProps}
        currentTime={90}
        duration={600}
      />
    );
    // 90s = 1:30, 600s = 10:00
    expect(screen.getByText('1:30')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('renders annotation markers for each annotation', () => {
    const annotations = [
      makeAnnotation('a1', 30, 'First note'),
      makeAnnotation('a2', 60, 'Second note'),
    ];
    render(<AnnotationTimeline {...defaultProps} annotations={annotations} />);
    // Each marker has a title attribute with timestamp info
    expect(document.querySelectorAll('[title]').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onSeek with timestamp when clicking an annotation marker', () => {
    const onSeek = vi.fn();
    const annotations = [makeAnnotation('a1', 45)];
    render(
      <AnnotationTimeline
        {...defaultProps}
        annotations={annotations}
        onSeek={onSeek}
      />
    );
    // Click the marker — it stops propagation and calls onSeek(ann.timestamp)
    const marker = document.querySelector('[title]') as HTMLElement;
    fireEvent.click(marker);
    expect(onSeek).toHaveBeenCalledWith(45);
  });

  it('calls onSeek when ArrowLeft key is pressed', () => {
    const onSeek = vi.fn();
    render(
      <AnnotationTimeline
        {...defaultProps}
        currentTime={30}
        duration={120}
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenCalledWith(25); // 30 - 5
  });

  it('calls onSeek when ArrowRight key is pressed', () => {
    const onSeek = vi.fn();
    render(
      <AnnotationTimeline
        {...defaultProps}
        currentTime={30}
        duration={120}
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenCalledWith(35); // 30 + 5
  });

  it('clamps ArrowLeft at 0', () => {
    const onSeek = vi.fn();
    render(
      <AnnotationTimeline
        {...defaultProps}
        currentTime={2}
        duration={120}
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('shows 0:00 for zero current time', () => {
    render(
      <AnnotationTimeline
        {...defaultProps}
        currentTime={0}
        duration={60}
      />
    );
    expect(screen.getAllByText('0:00').length).toBeGreaterThanOrEqual(1);
  });
});

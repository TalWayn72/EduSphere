import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  VideoProgressMarkers,
  annotationsToMarkers,
} from './VideoProgressMarkers';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation } from '@/types/annotations';

const makeAnnotation = (overrides: Partial<Annotation>): Annotation => ({
  id: 'ann-1',
  content: 'Test note',
  layer: AnnotationLayer.PERSONAL,
  userId: 'u1',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '1:30',
  contentId: 'c1',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
  replies: [],
  ...overrides,
});

const ANNOTATIONS: Annotation[] = [
  makeAnnotation({ id: 'a1', contentTimestamp: 30 }),
  makeAnnotation({ id: 'a2', contentTimestamp: 90, layer: AnnotationLayer.SHARED }),
  makeAnnotation({ id: 'a3', contentTimestamp: undefined }), // no timestamp — should be filtered
];

describe('annotationsToMarkers', () => {
  it('filters out annotations without contentTimestamp', () => {
    const markers = annotationsToMarkers(ANNOTATIONS);
    expect(markers).toHaveLength(2);
  });

  it('maps annotation to marker with correct timestamp', () => {
    const markers = annotationsToMarkers([ANNOTATIONS[0]!]);
    expect(markers[0]!.timestamp).toBe(30);
  });

  it('includes layer in marker', () => {
    const markers = annotationsToMarkers([ANNOTATIONS[1]!]);
    expect(markers[0]!.layer).toBe(AnnotationLayer.SHARED);
  });

  it('includes label with layer name and user name', () => {
    const markers = annotationsToMarkers([ANNOTATIONS[0]!]);
    expect(markers[0]!.label).toMatch(/personal/i);
    expect(markers[0]!.label).toMatch(/alice/i);
  });
});

describe('VideoProgressMarkers', () => {
  it('renders null when duration is 0', () => {
    const { container } = render(
      <VideoProgressMarkers
        annotations={ANNOTATIONS}
        duration={0}
        onSeek={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a marker button for each annotation with contentTimestamp', () => {
    render(
      <VideoProgressMarkers
        annotations={ANNOTATIONS}
        duration={300}
        onSeek={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2); // 2 with timestamp, 1 without
  });

  it('each marker has aria-label with formatted time', () => {
    render(
      <VideoProgressMarkers
        annotations={[ANNOTATIONS[0]!]}
        duration={300}
        onSeek={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /jump to annotation at 0:30/i })
    ).toBeInTheDocument();
  });

  it('calls onSeek with correct timestamp when marker is clicked', () => {
    const onSeek = vi.fn();
    render(
      <VideoProgressMarkers
        annotations={[ANNOTATIONS[0]!]}
        duration={300}
        onSeek={onSeek}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /0:30/i }));
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('calls onSeek when Enter key is pressed on marker', () => {
    const onSeek = vi.fn();
    render(
      <VideoProgressMarkers
        annotations={[ANNOTATIONS[1]!]}
        duration={300}
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /1:30/i }), {
      key: 'Enter',
    });
    expect(onSeek).toHaveBeenCalledWith(90);
  });

  it('calls onSeek when Space key is pressed on marker', () => {
    const onSeek = vi.fn();
    render(
      <VideoProgressMarkers
        annotations={[ANNOTATIONS[1]!]}
        duration={300}
        onSeek={onSeek}
      />
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /1:30/i }), {
      key: ' ',
    });
    expect(onSeek).toHaveBeenCalledWith(90);
  });

  it('renders no markers when all annotations lack contentTimestamp', () => {
    const { container } = render(
      <VideoProgressMarkers
        annotations={[ANNOTATIONS[2]!]}
        duration={300}
        onSeek={vi.fn()}
      />
    );
    // React fragment renders nothing visible
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container).toBeTruthy(); // component renders, just empty
  });
});

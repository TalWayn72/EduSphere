import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentAnnotationPanel } from './DocumentAnnotationPanel';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation } from '@/types/annotations';

const makeAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: 'ann-1',
  content: 'This is an insightful note',
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-1',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '2024-01-01T10:00:00Z',
  contentId: 'content-1',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  ...overrides,
});

const baseProps = {
  allAnnotations: [],
  focusedAnnotationId: null,
  onAnnotationFocus: vi.fn(),
  onAddAnnotation: vi.fn().mockResolvedValue(undefined),
  fetching: false,
  error: null,
};

describe('DocumentAnnotationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseProps.onAnnotationFocus = vi.fn();
    baseProps.onAddAnnotation = vi.fn().mockResolvedValue(undefined);
  });

  it('renders the "Text Annotations" heading', () => {
    render(<DocumentAnnotationPanel {...baseProps} />);
    expect(screen.getAllByText('Text Annotations')[0]).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching is true', () => {
    const { container } = render(
      <DocumentAnnotationPanel {...baseProps} fetching={true} />
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when error prop is set', () => {
    render(
      <DocumentAnnotationPanel
        {...baseProps}
        error="Failed to load annotations"
      />
    );
    expect(screen.getByText('Failed to load annotations')).toBeInTheDocument();
  });

  it('shows empty state when allAnnotations is empty', () => {
    render(<DocumentAnnotationPanel {...baseProps} />);
    expect(screen.getByText('No text annotations yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Select text in the document to annotate.')
    ).toBeInTheDocument();
  });

  it('shows annotation count in header', () => {
    const annotations = [makeAnnotation(), makeAnnotation({ id: 'ann-2' })];
    render(<DocumentAnnotationPanel {...baseProps} allAnnotations={annotations} />);
    expect(screen.getByText('2 annotations')).toBeInTheDocument();
  });

  it('shows singular "annotation" when only one exists', () => {
    const annotations = [makeAnnotation()];
    render(<DocumentAnnotationPanel {...baseProps} allAnnotations={annotations} />);
    expect(screen.getByText('1 annotation')).toBeInTheDocument();
  });

  it('renders annotation content and user name', () => {
    const annotations = [makeAnnotation()];
    render(<DocumentAnnotationPanel {...baseProps} allAnnotations={annotations} />);
    expect(screen.getByText('This is an insightful note')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders text range when textRange is present', () => {
    const annotations = [
      makeAnnotation({ textRange: { from: 10, to: 50 } }),
    ];
    render(<DocumentAnnotationPanel {...baseProps} allAnnotations={annotations} />);
    expect(screen.getByText('Position: chars 10–50')).toBeInTheDocument();
  });

  it('calls onAnnotationFocus with annotation id when card is clicked', () => {
    const onAnnotationFocus = vi.fn();
    const annotations = [makeAnnotation()];
    render(
      <DocumentAnnotationPanel
        {...baseProps}
        allAnnotations={annotations}
        onAnnotationFocus={onAnnotationFocus}
      />
    );
    fireEvent.click(screen.getByText('This is an insightful note'));
    expect(onAnnotationFocus).toHaveBeenCalledWith('ann-1');
  });

  it('calls onAnnotationFocus with null when focused annotation is clicked again', () => {
    const onAnnotationFocus = vi.fn();
    const annotations = [makeAnnotation()];
    render(
      <DocumentAnnotationPanel
        {...baseProps}
        allAnnotations={annotations}
        focusedAnnotationId="ann-1"
        onAnnotationFocus={onAnnotationFocus}
      />
    );
    fireEvent.click(screen.getByText('This is an insightful note'));
    expect(onAnnotationFocus).toHaveBeenCalledWith(null);
  });

  it('renders INSTRUCTOR layer badge with Authority label', () => {
    const annotations = [
      makeAnnotation({ layer: AnnotationLayer.INSTRUCTOR, userRole: 'instructor' }),
    ];
    render(<DocumentAnnotationPanel {...baseProps} allAnnotations={annotations} />);
    expect(screen.getByText(/Authority/)).toBeInTheDocument();
  });
});

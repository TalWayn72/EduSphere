import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCommentPanel } from '@/components/annotation/WordCommentPanel';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation } from '@/types/annotations';

// Mock dependencies
vi.mock('@/components/annotation/CommentCard', () => ({
  CommentCard: ({
    annotation,
    isFocused,
    onFocus,
  }: {
    annotation: Annotation;
    isFocused: boolean;
    onFocus: (id: string) => void;
  }) => (
    <div
      data-testid={`comment-card-${annotation.id}`}
      data-focused={isFocused}
      onClick={() => onFocus(annotation.id)}
    >
      {annotation.content}
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  MessageSquarePlus: () => <span data-testid="icon-plus" />,
  Filter: () => <span data-testid="icon-filter" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.HTMLAttributes<HTMLButtonElement> & {
    onClick?: React.MouseEventHandler;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

const makeAnnotation = (
  id: string,
  layer = AnnotationLayer.PERSONAL
): Annotation => ({
  id,
  content: `Comment ${id}`,
  layer,
  userId: 'u1',
  userName: 'User',
  userRole: 'student',
  timestamp: '2024-01-01T00:00:00Z',
  contentId: 'doc-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  textRange: { from: 10, to: 50 },
});

describe('WordCommentPanel', () => {
  const defaultProps = {
    annotations: [],
    focusedAnnotationId: null,
    onFocusAnnotation: vi.fn(),
    onAddComment: vi.fn(),
    selectionActive: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement scrollIntoView — stub it
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    // Restore prototype after each test
    delete (window.HTMLElement.prototype as Partial<HTMLElement>)
      .scrollIntoView;
  });

  it('renders "Comments" heading', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('renders all 5 filter buttons (ALL + 4 layers)', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Authority')).toBeInTheDocument();
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
  });

  it('"Add" button is disabled when selectionActive is false', () => {
    render(<WordCommentPanel {...defaultProps} selectionActive={false} />);
    expect(screen.getByText('Add')).toBeDisabled();
  });

  it('"Add" button is enabled when selectionActive is true', () => {
    render(<WordCommentPanel {...defaultProps} selectionActive={true} />);
    expect(screen.getByText('Add')).not.toBeDisabled();
  });

  it('calls onAddComment when Add button clicked and selection active', () => {
    const onAddComment = vi.fn();
    render(
      <WordCommentPanel
        {...defaultProps}
        selectionActive={true}
        onAddComment={onAddComment}
      />
    );
    fireEvent.click(screen.getByText('Add'));
    expect(onAddComment).toHaveBeenCalled();
  });

  it('renders comment cards for each annotation', () => {
    const annotations = [makeAnnotation('a1'), makeAnnotation('a2')];
    render(<WordCommentPanel {...defaultProps} annotations={annotations} />);
    expect(screen.getByTestId('comment-card-a1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-card-a2')).toBeInTheDocument();
  });

  it('shows annotation count in header', () => {
    const annotations = [makeAnnotation('a1'), makeAnnotation('a2')];
    render(<WordCommentPanel {...defaultProps} annotations={annotations} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters annotations by layer when filter clicked', () => {
    const annotations = [
      makeAnnotation('a1', AnnotationLayer.PERSONAL),
      makeAnnotation('a2', AnnotationLayer.SHARED),
    ];
    render(<WordCommentPanel {...defaultProps} annotations={annotations} />);
    // Click "Private" filter (PERSONAL)
    fireEvent.click(screen.getByText('Private'));
    expect(screen.getByTestId('comment-card-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('comment-card-a2')).not.toBeInTheDocument();
  });

  it('shows all cards after clicking "All" filter', () => {
    const annotations = [
      makeAnnotation('a1', AnnotationLayer.PERSONAL),
      makeAnnotation('a2', AnnotationLayer.SHARED),
    ];
    render(<WordCommentPanel {...defaultProps} annotations={annotations} />);
    fireEvent.click(screen.getByText('Private'));
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByTestId('comment-card-a1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-card-a2')).toBeInTheDocument();
  });

  it('passes isFocused=true to the focused comment card', () => {
    const annotations = [makeAnnotation('a1')];
    render(
      <WordCommentPanel
        {...defaultProps}
        annotations={annotations}
        focusedAnnotationId="a1"
      />
    );
    expect(screen.getByTestId('comment-card-a1')).toHaveAttribute(
      'data-focused',
      'true'
    );
  });

  it('shows empty state message when no annotations and no selection', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByText(/Select text in the document/)).toBeInTheDocument();
  });

  it('shows different empty state when selection is active', () => {
    render(<WordCommentPanel {...defaultProps} selectionActive={true} />);
    expect(
      screen.getByText(/Click \u201cAdd\u201d to comment/)
    ).toBeInTheDocument();
  });
});

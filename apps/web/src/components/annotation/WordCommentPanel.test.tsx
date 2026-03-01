/**
 * WordCommentPanel — unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCommentPanel } from './WordCommentPanel';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

// ── Mock CommentCard ─────────────────────────────────────────────────────────

vi.mock('@/components/annotation/CommentCard', () => ({
  CommentCard: ({
    annotation,
    isFocused,
    onFocus,
    onReply,
    onResolve,
  }: {
    annotation: Annotation;
    isFocused: boolean;
    onFocus: (id: string) => void;
    onReply?: (id: string) => void;
    onResolve?: (id: string) => void;
  }) => (
    <div
      data-testid={`comment-card-${annotation.id}`}
      data-focused={String(isFocused)}
    >
      <span>{annotation.content}</span>
      <button onClick={() => onFocus(annotation.id)}>focus</button>
      {onReply && (
        <button onClick={() => onReply(annotation.id)}>reply</button>
      )}
      {onResolve && (
        <button onClick={() => onResolve(annotation.id)}>resolve</button>
      )}
    </div>
  ),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeAnnotation = (
  id: string,
  layer: AnnotationLayer = AnnotationLayer.PERSONAL
): Annotation => ({
  id,
  content: `Comment ${id}`,
  layer,
  userId: 'user-1',
  userName: 'Alice Smith',
  userRole: 'student',
  timestamp: new Date().toISOString(),
  contentId: 'content-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const defaultProps = {
  annotations: [makeAnnotation('ann-1'), makeAnnotation('ann-2')],
  focusedAnnotationId: null,
  onFocusAnnotation: vi.fn(),
  onAddComment: vi.fn(),
  selectionActive: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement scrollIntoView — stub it globally
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WordCommentPanel', () => {
  it('renders the Comments heading', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('displays total annotation count in header', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders a CommentCard for each annotation', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByTestId('comment-card-ann-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-card-ann-2')).toBeInTheDocument();
  });

  it('shows empty state message when no annotations and no selection', () => {
    render(<WordCommentPanel {...defaultProps} annotations={[]} />);
    expect(
      screen.getByText(/select text in the document to add a comment/i)
    ).toBeInTheDocument();
  });

  it('shows selection-active empty message when selection is active and no annotations', () => {
    render(
      <WordCommentPanel
        {...defaultProps}
        annotations={[]}
        selectionActive={true}
      />
    );
    expect(
      screen.getByText(/click.*add.*to comment on the selected text/i)
    ).toBeInTheDocument();
  });

  it('Add button is disabled when selectionActive is false', () => {
    render(<WordCommentPanel {...defaultProps} selectionActive={false} />);
    const addBtn = screen.getByRole('button', { name: /add/i });
    expect(addBtn).toBeDisabled();
  });

  it('Add button is enabled when selectionActive is true', () => {
    render(
      <WordCommentPanel {...defaultProps} selectionActive={true} />
    );
    const addBtn = screen.getByRole('button', { name: /add/i });
    expect(addBtn).not.toBeDisabled();
  });

  it('calls onAddComment when Add button is clicked and selectionActive', () => {
    const onAddComment = vi.fn();
    render(
      <WordCommentPanel
        {...defaultProps}
        selectionActive={true}
        onAddComment={onAddComment}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAddComment).toHaveBeenCalledTimes(1);
  });

  it('renders layer filter tabs including All, Private, Public', () => {
    render(<WordCommentPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Private' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Public' })).toBeInTheDocument();
  });

  it('filters annotations by layer when a layer tab is clicked', () => {
    const annotations = [
      makeAnnotation('ann-1', AnnotationLayer.PERSONAL),
      makeAnnotation('ann-2', AnnotationLayer.SHARED),
    ];
    render(<WordCommentPanel {...defaultProps} annotations={annotations} />);

    // Click "Private" (PERSONAL) filter
    fireEvent.click(screen.getByRole('button', { name: 'Private' }));
    expect(screen.getByTestId('comment-card-ann-1')).toBeInTheDocument();
    expect(screen.queryByTestId('comment-card-ann-2')).not.toBeInTheDocument();
  });

  it('shows all annotations again when All tab is clicked after filter', () => {
    const annotations = [
      makeAnnotation('ann-1', AnnotationLayer.PERSONAL),
      makeAnnotation('ann-2', AnnotationLayer.SHARED),
    ];
    render(<WordCommentPanel {...defaultProps} annotations={annotations} />);

    fireEvent.click(screen.getByRole('button', { name: 'Private' }));
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByTestId('comment-card-ann-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-card-ann-2')).toBeInTheDocument();
  });

  it('passes isFocused=true to the focused annotation card', () => {
    render(
      <WordCommentPanel {...defaultProps} focusedAnnotationId="ann-1" />
    );
    const card = screen.getByTestId('comment-card-ann-1');
    expect(card.getAttribute('data-focused')).toBe('true');
  });

  it('calls onFocusAnnotation when a card focus button is clicked', () => {
    const onFocusAnnotation = vi.fn();
    render(
      <WordCommentPanel
        {...defaultProps}
        onFocusAnnotation={onFocusAnnotation}
      />
    );
    const focusBtns = screen.getAllByRole('button', { name: 'focus' });
    fireEvent.click(focusBtns[0]);
    expect(onFocusAnnotation).toHaveBeenCalledWith('ann-1');
  });
});

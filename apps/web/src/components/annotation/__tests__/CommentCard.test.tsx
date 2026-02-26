import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentCard } from '@/components/annotation/CommentCard';
import { AnnotationLayer } from '@/types/annotations';
import type { Annotation } from '@/types/annotations';

vi.mock('lucide-react', () => ({
  MessageSquare: () => <span data-testid="icon-msg" />,
  Check: () => <span data-testid="icon-check" />,
  ChevronDown: () => <span data-testid="icon-down" />,
  ChevronUp: () => <span data-testid="icon-up" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.HTMLAttributes<HTMLButtonElement> & {
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    size?: string;
    variant?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(' '),
}));

const baseAnnotation: Annotation = {
  id: 'ann-1',
  content: 'This is a test comment',
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-1',
  userName: 'Alice Smith',
  userRole: 'student',
  timestamp: '2024-01-01T10:00:00Z',
  contentId: 'doc-1',
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
  textRange: { from: 10, to: 50 },
};

describe('CommentCard', () => {
  it('renders author name', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders initials avatar', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders layer label', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText(/Private/)).toBeInTheDocument();
  });

  it('renders comment text', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  it('calls onFocus with annotation id when card is clicked', () => {
    const onFocus = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={onFocus}
      />
    );
    fireEvent.click(screen.getByRole('article'));
    expect(onFocus).toHaveBeenCalledWith('ann-1');
  });

  it('applies focus ring classes when isFocused is true', () => {
    const { container } = render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={true}
        onFocus={vi.fn()}
      />
    );
    const card = container.querySelector('[role="article"]');
    expect(card?.className).toContain('ring-1');
  });

  it('does not apply focus ring classes when isFocused is false', () => {
    const { container } = render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    const card = container.querySelector('[role="article"]');
    expect(card?.className).not.toContain('ring-1');
  });

  it('truncates long comments and shows "show more" button', () => {
    const longAnnotation: Annotation = {
      ...baseAnnotation,
      content: 'a'.repeat(200),
    };
    render(
      <CommentCard
        annotation={longAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('show more')).toBeInTheDocument();
  });

  it('expands long comment on "show more" click', () => {
    const longAnnotation: Annotation = {
      ...baseAnnotation,
      content: 'a'.repeat(200),
    };
    render(
      <CommentCard
        annotation={longAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('show more'));
    expect(screen.getByText('show less')).toBeInTheDocument();
  });

  it('does not show "show more" for short comments', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.queryByText('show more')).not.toBeInTheDocument();
  });

  it('calls onReply when Reply button is clicked', () => {
    const onReply = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onReply={onReply}
      />
    );
    fireEvent.click(screen.getByText(/Reply/));
    expect(onReply).toHaveBeenCalledWith('ann-1');
  });

  it('does not call onFocus when Reply button is clicked', () => {
    const onFocus = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={onFocus}
        onReply={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Reply/));
    expect(onFocus).not.toHaveBeenCalled();
  });

  it('calls onResolve when Resolve button is clicked', () => {
    const onResolve = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onResolve={onResolve}
      />
    );
    fireEvent.click(screen.getByText(/Resolve/));
    expect(onResolve).toHaveBeenCalledWith('ann-1');
  });

  it('does not show Reply button when onReply is not provided', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.queryByText(/Reply/)).not.toBeInTheDocument();
  });

  it('does not show Resolve button when onResolve is not provided', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.queryByText(/Resolve/)).not.toBeInTheDocument();
  });

  it('shows reply count when annotation has replies', () => {
    const withReplies: Annotation = {
      ...baseAnnotation,
      replies: [
        {
          ...baseAnnotation,
          id: 'reply-1',
          content: 'A reply',
          parentId: 'ann-1',
        },
      ],
    };
    render(
      <CommentCard
        annotation={withReplies}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders relative date with "ago" suffix', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('renders depth=1 reply with indented style', () => {
    const { container } = render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        depth={1}
      />
    );
    const card = container.querySelector('[role="article"]');
    expect(card?.className).toContain('ml-4');
  });

  it('does not show Reply button at depth=1', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onReply={vi.fn()}
        depth={1}
      />
    );
    expect(screen.queryByText(/Reply/)).not.toBeInTheDocument();
  });
});

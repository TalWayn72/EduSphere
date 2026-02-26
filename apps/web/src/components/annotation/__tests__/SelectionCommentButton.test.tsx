/**
 * SelectionCommentButton unit tests
 *
 * Covers:
 *  1. Renders nothing when position is null
 *  2. Renders button when position is provided
 *  3. Calls onAddComment with the correct position when clicked
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionCommentButton } from '@/components/annotation/SelectionCommentButton';

vi.mock('lucide-react', () => ({
  MessageSquarePlus: () => <span data-testid="icon-plus" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: React.HTMLAttributes<HTMLButtonElement> & {
    onClick?: React.MouseEventHandler;
  }) => <button onClick={onClick}>{children}</button>,
}));

describe('SelectionCommentButton', () => {
  it('renders nothing when position is null', () => {
    const { container } = render(
      <SelectionCommentButton position={null} onAddComment={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders button when position is provided', () => {
    render(
      <SelectionCommentButton position={{ x: 100, y: 200 }} onAddComment={vi.fn()} />,
    );
    expect(screen.getByText(/Add Comment/)).toBeInTheDocument();
  });

  it('calls onAddComment with position when clicked', () => {
    const onAddComment = vi.fn();
    const pos = { x: 100, y: 200 };
    render(<SelectionCommentButton position={pos} onAddComment={onAddComment} />);
    fireEvent.click(screen.getByText(/Add Comment/));
    expect(onAddComment).toHaveBeenCalledWith(pos);
  });
});

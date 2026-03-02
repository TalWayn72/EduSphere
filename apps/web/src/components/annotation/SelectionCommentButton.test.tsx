/**
 * SelectionCommentButton — unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionCommentButton } from './SelectionCommentButton';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SelectionCommentButton', () => {
  it('renders nothing when position is null', () => {
    const { container } = render(
      <SelectionCommentButton position={null} onAddComment={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Add Comment button when position is provided', () => {
    render(
      <SelectionCommentButton
        position={{ x: 100, y: 200 }}
        onAddComment={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /add comment/i })
    ).toBeInTheDocument();
  });

  it('positions the wrapper with fixed style at correct top/left', () => {
    const { container } = render(
      <SelectionCommentButton
        position={{ x: 150, y: 300 }}
        onAddComment={vi.fn()}
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.position).toBe('fixed');
    expect(wrapper.style.top).toBe('264px'); // 300 - 36
    expect(wrapper.style.left).toBe('150px');
  });

  it('sets zIndex 40 on the wrapper', () => {
    const { container } = render(
      <SelectionCommentButton
        position={{ x: 50, y: 100 }}
        onAddComment={vi.fn()}
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.zIndex).toBe('40');
  });

  it('calls onAddComment with position when button is clicked', () => {
    const onAddComment = vi.fn();
    const position = { x: 80, y: 160 };
    render(
      <SelectionCommentButton position={position} onAddComment={onAddComment} />
    );
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));
    expect(onAddComment).toHaveBeenCalledWith(position);
    expect(onAddComment).toHaveBeenCalledTimes(1);
  });

  it('does not call onAddComment when position is null (component not rendered)', () => {
    const onAddComment = vi.fn();
    const { container } = render(
      <SelectionCommentButton position={null} onAddComment={onAddComment} />
    );
    expect(container.firstChild).toBeNull();
    expect(onAddComment).not.toHaveBeenCalled();
  });

  it('re-renders at new position when position prop changes', () => {
    const { rerender, container } = render(
      <SelectionCommentButton
        position={{ x: 10, y: 50 }}
        onAddComment={vi.fn()}
      />
    );
    let wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.left).toBe('10px');

    rerender(
      <SelectionCommentButton
        position={{ x: 200, y: 300 }}
        onAddComment={vi.fn()}
      />
    );
    wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.left).toBe('200px');
  });

  it('disappears when position changes from a value to null', () => {
    const { rerender, container } = render(
      <SelectionCommentButton
        position={{ x: 50, y: 100 }}
        onAddComment={vi.fn()}
      />
    );
    expect(container.firstChild).not.toBeNull();

    rerender(<SelectionCommentButton position={null} onAddComment={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with translateX transform for centering', () => {
    const { container } = render(
      <SelectionCommentButton
        position={{ x: 100, y: 200 }}
        onAddComment={vi.fn()}
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.transform).toBe('translateX(-50%)');
  });
});

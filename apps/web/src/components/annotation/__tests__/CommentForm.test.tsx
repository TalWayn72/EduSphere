/**
 * CommentForm unit tests
 *
 * Covers:
 *  1. Renders textarea
 *  2. Save disabled when empty
 *  3. Save enabled after typing
 *  4. onSubmit called with correct text + layer
 *  5. onCancel via Cancel button
 *  6. onCancel via X button
 *  7. onCancel via Escape keydown
 *  8. All 4 layer options present in select
 *  9. Submitted text is trimmed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentForm } from '@/components/annotation/CommentForm';
import { AnnotationLayer } from '@/types/annotations';

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
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

describe('CommentForm', () => {
  const position = { x: 400, y: 300 };
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Save button is disabled when textarea is empty', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('Save button is enabled after typing text', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hello' },
    });
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('calls onSubmit with text and layer when Save clicked', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'My comment' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith(
      'My comment',
      AnnotationLayer.PERSONAL
    );
  });

  it('calls onCancel when Cancel clicked', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when X button clicked', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel on Escape keydown', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows all 4 layer options in select', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
  });

  it('trims whitespace from submitted text', () => {
    render(
      <CommentForm
        position={position}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '  trimmed  ' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith('trimmed', expect.any(String));
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddAnnotationForm } from './AddAnnotationForm';

const defaultProps = {
  currentTime: 75,
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AddAnnotationForm', () => {
  it('renders the timestamp header with formatted time', () => {
    render(<AddAnnotationForm {...defaultProps} />);
    expect(screen.getByText('Note at 1:15')).toBeInTheDocument();
  });

  it('formats time with zero-padded seconds', () => {
    render(<AddAnnotationForm {...defaultProps} currentTime={65} />);
    expect(screen.getByText('Note at 1:05')).toBeInTheDocument();
  });

  it('renders the textarea with placeholder', () => {
    render(<AddAnnotationForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    render(<AddAnnotationForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('Save button is disabled when textarea is empty', () => {
    render(<AddAnnotationForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables Save button when text is entered', () => {
    render(<AddAnnotationForm {...defaultProps} />);
    fireEvent.change(
      screen.getByRole('textbox', { name: /annotation text/i }),
      { target: { value: 'My annotation' } }
    );
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
  });

  it('calls onSave with trimmed text and timestamp when Save is clicked', () => {
    const onSave = vi.fn();
    render(
      <AddAnnotationForm {...defaultProps} onSave={onSave} currentTime={90} />
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: /annotation text/i }),
      { target: { value: '  Important point  ' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith('Important point', 90);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<AddAnnotationForm {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('saves on Ctrl+Enter keydown', () => {
    const onSave = vi.fn();
    render(<AddAnnotationForm {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByRole('textbox', { name: /annotation text/i });
    fireEvent.change(textarea, { target: { value: 'Note via keyboard' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onSave).toHaveBeenCalledWith('Note via keyboard', 75);
  });

  it('cancels on Escape keydown', () => {
    const onCancel = vi.fn();
    render(<AddAnnotationForm {...defaultProps} onCancel={onCancel} />);
    const textarea = screen.getByRole('textbox', { name: /annotation text/i });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when whitespace-only content is submitted', () => {
    const onSave = vi.fn();
    render(<AddAnnotationForm {...defaultProps} onSave={onSave} />);
    const textarea = screen.getByRole('textbox', { name: /annotation text/i });
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
  });
});

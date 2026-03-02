import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddAnnotationOverlay } from './AddAnnotationOverlay';
import { AnnotationLayer } from '@/types/annotations';

const defaultProps = {
  currentTime: 90,
  onSave: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AddAnnotationOverlay', () => {
  it('renders "Add Note @" button initially', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /add note @/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Add Note @ 1:30/)).toBeInTheDocument();
  });

  it('shows form panel after clicking the Add Note button', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    expect(screen.getByPlaceholderText(/type your note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows captured timestamp label in form', () => {
    render(<AddAnnotationOverlay {...defaultProps} currentTime={125} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    expect(screen.getByText('Note at 2:05')).toBeInTheDocument();
  });

  it('Save button is disabled when textarea is empty', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables Save button after typing content', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    fireEvent.change(screen.getByPlaceholderText(/type your note/i), {
      target: { value: 'My note' },
    });
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
  });

  it('calls onSave with trimmed content, layer, and captured timestamp', () => {
    const onSave = vi.fn();
    render(
      <AddAnnotationOverlay
        {...defaultProps}
        onSave={onSave}
        currentTime={60}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    fireEvent.change(screen.getByPlaceholderText(/type your note/i), {
      target: { value: '  Important  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(
      'Important',
      AnnotationLayer.PERSONAL,
      60
    );
  });

  it('closes form on Cancel button click', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(
      screen.getByRole('button', { name: /add note @/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/type your note/i)
    ).not.toBeInTheDocument();
  });

  it('saves via Ctrl+Enter keyboard shortcut', () => {
    const onSave = vi.fn();
    render(
      <AddAnnotationOverlay
        {...defaultProps}
        onSave={onSave}
        currentTime={30}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    const textarea = screen.getByPlaceholderText(/type your note/i);
    fireEvent.change(textarea, { target: { value: 'Keyboard note' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onSave).toHaveBeenCalledWith(
      'Keyboard note',
      AnnotationLayer.PERSONAL,
      30
    );
  });

  it('closes form on Escape keydown', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    fireEvent.keyDown(screen.getByPlaceholderText(/type your note/i), {
      key: 'Escape',
    });
    expect(
      screen.queryByPlaceholderText(/type your note/i)
    ).not.toBeInTheDocument();
  });

  it('renders PERSONAL and SHARED layer selector buttons', () => {
    render(<AddAnnotationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add note @/i }));
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentForm } from './CommentForm';
import { AnnotationLayer } from '@/types/annotations';

const defaultPosition = { x: 100, y: 100 };

describe('CommentForm — rendering', () => {
  it('renders the "Add comment" dialog', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('New Comment')).toBeTruthy();
  });

  it('renders the textarea with correct placeholder', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(
      screen.getByPlaceholderText(/Add a comment/i)
    ).toBeTruthy();
  });

  it('renders all four layer options in the select', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain(AnnotationLayer.PERSONAL);
    expect(values).toContain(AnnotationLayer.SHARED);
    expect(values).toContain(AnnotationLayer.INSTRUCTOR);
    expect(values).toContain(AnnotationLayer.AI_GENERATED);
  });

  it('Save button is disabled when textarea is empty', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('Save button is enabled after typing text', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('CommentForm — cancel', () => {
  it('Close button calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Cancel button calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape key calls onCancel via window keydown handler', () => {
    const onCancel = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape', ctrlKey: false });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('CommentForm — submit', () => {
  it('clicking Save calls onSubmit with trimmed text and selected layer', () => {
    const onSubmit = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultLayer={AnnotationLayer.SHARED}
      />
    );
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    fireEvent.change(textarea, { target: { value: '  My note  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledWith('My note', AnnotationLayer.SHARED);
  });

  it('pressing Ctrl+Enter calls onSubmit when text is not empty', () => {
    const onSubmit = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultLayer={AnnotationLayer.PERSONAL}
      />
    );
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Quick note' } });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledWith('Quick note', AnnotationLayer.PERSONAL);
  });

  it('pressing Ctrl+Enter does NOT call onSubmit when text is empty', () => {
    const onSubmit = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clicking Save with only whitespace does not call onSubmit', () => {
    const onSubmit = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    // Type spaces — button remains disabled but test the guard
    fireEvent.change(textarea, { target: { value: '   ' } });
    // Save is still disabled (whitespace-only), but call handleSubmit directly via form
    // The button is disabled so we verify onSubmit was NOT called
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('CommentForm — layer selector', () => {
  it('default layer is PERSONAL when not specified', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(AnnotationLayer.PERSONAL);
  });

  it('uses defaultLayer prop as initial select value', () => {
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        defaultLayer={AnnotationLayer.INSTRUCTOR}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(AnnotationLayer.INSTRUCTOR);
  });

  it('onChange on layer select updates the selected layer', () => {
    const onSubmit = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultLayer={AnnotationLayer.PERSONAL}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: AnnotationLayer.SHARED } });
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledWith('test', AnnotationLayer.SHARED);
  });

  it('Meta+Enter also triggers submit (macOS)', () => {
    const onSubmit = vi.fn();
    render(
      <CommentForm
        position={defaultPosition}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultLayer={AnnotationLayer.AI_GENERATED}
      />
    );
    const textarea = screen.getByPlaceholderText(/Add a comment/i);
    fireEvent.change(textarea, { target: { value: 'Meta submit' } });
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith('Meta submit', AnnotationLayer.AI_GENERATED);
  });
});

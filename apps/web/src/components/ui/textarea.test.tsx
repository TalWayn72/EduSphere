import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea data-testid="ta" />);
    expect(screen.getByTestId('ta').tagName).toBe('TEXTAREA');
  });

  it('forwards className', () => {
    render(<Textarea className="mt-4" data-testid="ta" />);
    expect(screen.getByTestId('ta')).toHaveClass('mt-4');
  });

  it('applies placeholder', () => {
    render(<Textarea placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handler = vi.fn();
    render(<Textarea onChange={handler} data-testid="ta" />);
    fireEvent.change(screen.getByTestId('ta'), { target: { value: 'text' } });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Textarea disabled data-testid="ta" />);
    expect(screen.getByTestId('ta')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('has correct displayName', () => {
    expect(Textarea.displayName).toBe('Textarea');
  });

  it('renders default value', () => {
    render(<Textarea data-testid="ta" defaultValue="Hello world" />);
    expect(screen.getByTestId('ta')).toHaveValue('Hello world');
  });
});

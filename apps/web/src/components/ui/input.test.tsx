import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('input').tagName).toBe('INPUT');
  });

  it('forwards className', () => {
    render(<Input className="mt-4" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('mt-4');
  });

  it('applies the type prop', () => {
    render(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
  });

  it('applies placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handler = vi.fn();
    render(<Input onChange={handler} data-testid="input" />);
    fireEvent.change(screen.getByTestId('input'), {
      target: { value: 'hello' },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Input disabled data-testid="input" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('has correct displayName', () => {
    expect(Input.displayName).toBe('Input');
  });

  it('spreads additional HTML attributes', () => {
    render(<Input aria-label="search" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('aria-label', 'search');
  });
});

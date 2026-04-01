import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from './switch';

describe('Switch', () => {
  it('renders with role="switch"', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('is unchecked by default (no aria-checked when undefined)', () => {
    render(<Switch />);
    // When checked prop is undefined, aria-checked is not set
    expect(screen.getByRole('switch')).not.toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('shows checked state via aria-checked', () => {
    render(<Switch checked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange when clicked', () => {
    const handler = vi.fn();
    render(<Switch checked={false} onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('toggles from checked to unchecked', () => {
    const handler = vi.fn();
    render(<Switch checked onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(false);
  });

  it('does not call handler when disabled', () => {
    const handler = vi.fn();
    render(<Switch disabled onCheckedChange={handler} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Switch disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('forwards className', () => {
    render(<Switch className="mt-2" />);
    expect(screen.getByRole('switch')).toHaveClass('mt-2');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Switch ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('has correct displayName', () => {
    expect(Switch.displayName).toBe('Switch');
  });

  it('applies bg-primary when checked', () => {
    render(<Switch checked />);
    expect(screen.getByRole('switch')).toHaveClass('bg-primary');
  });

  it('applies bg-input when unchecked', () => {
    render(<Switch checked={false} />);
    expect(screen.getByRole('switch')).toHaveClass('bg-input');
  });
});

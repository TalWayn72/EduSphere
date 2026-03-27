import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders with role="none" by default (decorative)', () => {
    render(<Separator data-testid="sep" />);
    const el = screen.getByTestId('sep');
    expect(el).toHaveAttribute('role', 'none');
  });

  it('renders with role="separator" when not decorative', () => {
    render(<Separator decorative={false} data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveAttribute('role', 'separator');
  });

  it('defaults to horizontal orientation', () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveClass('h-[1px]', 'w-full');
  });

  it('renders vertical orientation', () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    const el = screen.getByTestId('sep');
    expect(el).toHaveClass('h-full', 'w-[1px]');
  });

  it('sets aria-orientation', () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('forwards className', () => {
    render(<Separator className="my-4" data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveClass('my-4');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Separator ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has correct displayName', () => {
    expect(Separator.displayName).toBe('Separator');
  });
});

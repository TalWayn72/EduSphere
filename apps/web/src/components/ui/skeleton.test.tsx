import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a div', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel')).toBeInTheDocument();
  });

  it('has animate-pulse class', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel')).toHaveClass('animate-pulse');
  });

  it('forwards className', () => {
    render(<Skeleton className="h-4 w-full" data-testid="skel" />);
    const el = screen.getByTestId('skel');
    expect(el).toHaveClass('h-4');
    expect(el).toHaveClass('w-full');
  });

  it('has bg-muted class', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel')).toHaveClass('bg-muted');
  });

  it('spreads additional HTML attributes', () => {
    render(<Skeleton aria-label="loading" data-testid="skel" />);
    expect(screen.getByTestId('skel')).toHaveAttribute('aria-label', 'loading');
  });

  it('renders children', () => {
    render(<Skeleton><span>child</span></Skeleton>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});

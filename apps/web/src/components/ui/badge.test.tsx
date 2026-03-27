import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary');
  });

  it('forwards className', () => {
    render(<Badge className="mt-2">Test</Badge>);
    expect(screen.getByText('Test')).toHaveClass('mt-2');
  });

  it('renders children', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">Sec</Badge>);
    expect(screen.getByText('Sec')).toHaveClass('bg-secondary');
  });

  it('applies destructive variant', () => {
    render(<Badge variant="destructive">Err</Badge>);
    expect(screen.getByText('Err')).toHaveClass('bg-destructive');
  });

  it('applies outline variant', () => {
    render(<Badge variant="outline">Out</Badge>);
    expect(screen.getByText('Out')).toHaveClass('text-foreground');
  });

  it('spreads additional HTML attributes', () => {
    render(<Badge data-testid="badge">B</Badge>);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });
});

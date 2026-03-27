import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScrollArea, ScrollBar } from './scroll-area';

describe('ScrollArea', () => {
  it('renders children', () => {
    render(<ScrollArea>Hello</ScrollArea>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('defaults to vertical overflow', () => {
    render(<ScrollArea data-testid="scroll">Content</ScrollArea>);
    expect(screen.getByTestId('scroll')).toHaveClass('overflow-y-auto');
  });

  it('applies horizontal orientation', () => {
    render(<ScrollArea orientation="horizontal" data-testid="scroll">C</ScrollArea>);
    expect(screen.getByTestId('scroll')).toHaveClass('overflow-x-auto');
  });

  it('applies both orientation', () => {
    render(<ScrollArea orientation="both" data-testid="scroll">C</ScrollArea>);
    expect(screen.getByTestId('scroll')).toHaveClass('overflow-auto');
  });

  it('forwards className', () => {
    render(<ScrollArea className="h-64" data-testid="scroll">C</ScrollArea>);
    expect(screen.getByTestId('scroll')).toHaveClass('h-64');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ScrollArea ref={ref}>R</ScrollArea>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has correct displayName', () => {
    expect(ScrollArea.displayName).toBe('ScrollArea');
  });
});

describe('ScrollBar', () => {
  it('renders a div', () => {
    render(<ScrollBar data-testid="bar" />);
    expect(screen.getByTestId('bar')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<ScrollBar className="w-2" data-testid="bar" />);
    expect(screen.getByTestId('bar')).toHaveClass('w-2');
  });

  it('has correct displayName', () => {
    expect(ScrollBar.displayName).toBe('ScrollBar');
  });
});

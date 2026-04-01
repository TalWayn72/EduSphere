import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert', () => {
  it('renders with role="alert"', () => {
    render(<Alert>Content</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<Alert className="mt-4">A</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('mt-4');
  });

  it('applies default variant classes', () => {
    render(<Alert>Default</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('bg-background');
  });

  it('applies destructive variant classes', () => {
    render(<Alert variant="destructive">Error</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('text-destructive');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Ref</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has correct displayName', () => {
    expect(Alert.displayName).toBe('Alert');
  });
});

describe('AlertTitle', () => {
  it('renders an h5 element', () => {
    render(<AlertTitle>Title</AlertTitle>);
    expect(screen.getByText('Title').tagName).toBe('H5');
  });

  it('forwards className', () => {
    render(
      <AlertTitle className="text-lg" data-testid="title">
        T
      </AlertTitle>
    );
    expect(screen.getByTestId('title')).toHaveClass('text-lg');
  });

  it('has correct displayName', () => {
    expect(AlertTitle.displayName).toBe('AlertTitle');
  });
});

describe('AlertDescription', () => {
  it('renders a div element', () => {
    render(<AlertDescription data-testid="desc">Desc</AlertDescription>);
    expect(screen.getByTestId('desc').tagName).toBe('DIV');
  });

  it('forwards className', () => {
    render(
      <AlertDescription className="italic" data-testid="desc">
        D
      </AlertDescription>
    );
    expect(screen.getByTestId('desc')).toHaveClass('italic');
  });

  it('has correct displayName', () => {
    expect(AlertDescription.displayName).toBe('AlertDescription');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from './label';

describe('Label', () => {
  it('renders a label element', () => {
    render(<Label>Name</Label>);
    const label = screen.getByText('Name');
    expect(label).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<Label className="mt-2" data-testid="lbl">L</Label>);
    expect(screen.getByTestId('lbl')).toHaveClass('mt-2');
  });

  it('renders children', () => {
    render(<Label>Email Address</Label>);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('supports htmlFor', () => {
    render(<Label htmlFor="email-input">Email</Label>);
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email-input');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Ref</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('has correct displayName', () => {
    expect(Label.displayName).toBe('Label');
  });

  it('spreads additional HTML attributes', () => {
    render(<Label data-testid="lbl" aria-describedby="help">L</Label>);
    expect(screen.getByTestId('lbl')).toHaveAttribute('aria-describedby', 'help');
  });
});

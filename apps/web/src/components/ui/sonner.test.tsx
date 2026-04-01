import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the sonner package
vi.mock('sonner', () => ({
  Toaster: function MockToaster(props: Record<string, unknown>) {
    return (
      <div
        data-testid="sonner-toaster"
        data-theme={props.theme}
        data-classname={props.className}
      />
    );
  },
}));

import { Toaster } from './sonner';

describe('Toaster (sonner)', () => {
  it('renders the Sonner Toaster', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('passes theme="system" by default', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster')).toHaveAttribute(
      'data-theme',
      'system'
    );
  });

  it('applies the toaster group className', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster')).toHaveAttribute(
      'data-classname',
      'toaster group'
    );
  });

  it('spreads additional props', () => {
    const { getByTestId } = render(
      <Toaster data-testid="sonner-toaster" position="top-right" />
    );
    expect(getByTestId('sonner-toaster')).toBeInTheDocument();
  });
});

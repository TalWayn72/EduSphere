import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Slider } from './slider';

describe('Slider', () => {
  it('renders a slider role', () => {
    render(<Slider defaultValue={[50]} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('forwards className to root', () => {
    render(<Slider className="mt-4" defaultValue={[50]} data-testid="slider" />);
    // className goes on the root span, check ancestors of the slider thumb
    const slider = screen.getByRole('slider');
    const root = slider.closest('[class*="mt-4"]');
    expect(root).not.toBeNull();
  });

  it('sets aria-valuemin', () => {
    render(<Slider min={10} defaultValue={[20]} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '10');
  });

  it('sets aria-valuemax', () => {
    render(<Slider max={200} defaultValue={[100]} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '200');
  });

  it('sets aria-valuenow', () => {
    render(<Slider defaultValue={[42]} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '42');
  });

  it('sets data-disabled when disabled', () => {
    render(<Slider disabled defaultValue={[50]} />);
    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled');
  });

  it('has correct displayName', () => {
    expect(Slider.displayName).toBe('Slider');
  });
});

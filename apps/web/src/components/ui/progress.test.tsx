/**
 * Progress component unit tests
 *
 * Regression guard for BUG-054:
 *   className prop applies to the container, NOT the indicator.
 *   indicatorClassName prop applies to the indicator bar only.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress component', () => {
  it('renders a progressbar role', () => {
    const { getByRole } = render(<Progress value={50} />);
    expect(getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the given value', () => {
    const { getByRole } = render(<Progress value={42} />);
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('defaults aria-valuenow to 0 when value is omitted', () => {
    const { getByRole } = render(<Progress />);
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('applies className to the container (outer div), NOT the indicator', () => {
    const { getByRole } = render(
      <Progress value={0} className="bg-destructive" />
    );
    const container = getByRole('progressbar');
    // container gets the className
    expect(container).toHaveClass('bg-destructive');
    // indicator (first child) must NOT have bg-destructive
    const indicator = container.firstElementChild as HTMLElement;
    expect(indicator).not.toHaveClass('bg-destructive');
  });

  it('applies indicatorClassName to the indicator bar, NOT the container', () => {
    const { getByRole } = render(
      <Progress value={50} indicatorClassName="bg-destructive" />
    );
    const container = getByRole('progressbar');
    // container must NOT carry the indicator color
    expect(container).not.toHaveClass('bg-destructive');
    // indicator (first child) must have it
    const indicator = container.firstElementChild as HTMLElement;
    expect(indicator).toHaveClass('bg-destructive');
  });

  it('indicator translateX is -100% when value=0 (bar empty)', () => {
    const { getByRole } = render(<Progress value={0} />);
    const indicator = getByRole('progressbar')
      .firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe('translateX(-100%)');
  });

  it('indicator translateX is 0% when value=100 (bar full)', () => {
    const { getByRole } = render(<Progress value={100} />);
    const indicator = getByRole('progressbar')
      .firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe('translateX(-0%)');
  });

  it('indicator translateX is -50% when value=50', () => {
    const { getByRole } = render(<Progress value={50} />);
    const indicator = getByRole('progressbar')
      .firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe('translateX(-50%)');
  });

  // BUG-054 regression: bg-primary on container overrides bg-primary/20 background
  // making the whole bar appear full even at 0%
  it('REGRESSION BUG-054: at 0% usage, container does NOT have bg-primary/bg-yellow-500/bg-destructive', () => {
    const { getByRole } = render(
      <Progress value={0} indicatorClassName="bg-primary" />
    );
    const container = getByRole('progressbar');
    // container must not have solid color classes — only bg-primary/20
    expect(container).not.toHaveClass('bg-primary');
    expect(container).not.toHaveClass('bg-yellow-500');
    expect(container).not.toHaveClass('bg-destructive');
    // indicator is moved off-screen
    const indicator = container.firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe('translateX(-100%)');
  });
});

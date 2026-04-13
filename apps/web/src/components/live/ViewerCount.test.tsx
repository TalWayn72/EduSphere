/**
 * ViewerCount component tests
 *
 * Covers:
 *  1. Renders count text in default mode
 *  2. Shows pulsing red dot
 *  3. aria-label conveys viewer count
 *  4. Compact mode renders count with dot
 *  5. Compact mode aria-label format
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { ViewerCount } from './ViewerCount';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ViewerCount', () => {
  it('renders viewer count text in default mode', () => {
    render(<ViewerCount count={42} />);
    // The Hebrew text "צופים" (viewers) appears alongside the count
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('has aria-label with count and viewers watching in default mode', () => {
    render(<ViewerCount count={100} />);
    expect(screen.getByLabelText('100 viewers watching')).toBeInTheDocument();
  });

  it('renders pulsing dot element in default mode', () => {
    const { container } = render(<ViewerCount count={5} />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).toBeTruthy();
  });

  it('compact mode renders count number', () => {
    render(<ViewerCount count={17} compact />);
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('compact mode has aria-label with count and viewers', () => {
    render(<ViewerCount count={17} compact />);
    expect(screen.getByLabelText('17 viewers')).toBeInTheDocument();
  });

  it('compact mode renders pulsing dot', () => {
    const { container } = render(<ViewerCount count={17} compact />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).toBeTruthy();
  });

  it('compact mode dot is aria-hidden', () => {
    const { container } = render(<ViewerCount count={5} compact />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeTruthy();
  });

  it('default mode dot is aria-hidden', () => {
    const { container } = render(<ViewerCount count={5} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeTruthy();
  });

  it('applies custom className in default mode', () => {
    const { container } = render(
      <ViewerCount count={5} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });

  it('applies custom className in compact mode', () => {
    const { container } = render(
      <ViewerCount count={5} compact className="compact-custom" />
    );
    expect(container.querySelector('.compact-custom')).toBeTruthy();
  });
});

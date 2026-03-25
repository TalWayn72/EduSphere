import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SkeletonCard } from './SkeletonCard';

describe('SkeletonCard', () => {
  it('renders skeleton card', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('is aria-hidden', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('skeleton-card')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has animate-pulse class', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('skeleton-card').className).toContain('animate-pulse');
  });
});

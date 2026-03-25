import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SkeletonCard } from './SkeletonCard';

describe('SkeletonCard', () => {
  it('renders skeleton card', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('session-skeleton')).toBeInTheDocument();
  });

  it('has animate-pulse class', () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId('session-skeleton').className).toContain('animate-pulse');
  });
});

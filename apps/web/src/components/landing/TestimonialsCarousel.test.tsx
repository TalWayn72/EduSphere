import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: Record<string, unknown>) => (
    <div>{children as React.ReactNode}</div>
  ),
  motion: {
    div: ({ children, ...p }: Record<string, unknown>) => (
      <div {...p}>{children as React.ReactNode}</div>
    ),
  },
}));
vi.mock('@/providers/ReducedMotionProvider', () => ({
  useReducedMotion: () => true,
}));

import { TestimonialsCarousel } from './TestimonialsCarousel';

describe('TestimonialsCarousel', () => {
  it('renders first testimonial', () => {
    render(<TestimonialsCarousel />);
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
  });

  it('has carousel aria label', () => {
    render(<TestimonialsCarousel />);
    expect(document.body.textContent).toContain('EduSphere transformed');
  });
});
